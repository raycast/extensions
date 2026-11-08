import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { PNG } from "pngjs";

const run = promisify(execFile);
const ICON_SIZE = 512;
const CACHE_VERSION = 2;

// AppKit resolves asset-catalog icons whose legacy ICNS is only a transparent stub.
// This only reads/renders an icon; it does not launch or automate the application.
const SYSTEM_ICON_SCRIPT = `
ObjC.import("AppKit");
function run(argv) {
  const icon = $.NSWorkspace.sharedWorkspace.iconForFile($(argv[0]));
  icon.size = $.NSMakeSize(512, 512);
  const bitmap = $.NSBitmapImageRep.imageRepWithData(icon.TIFFRepresentation);
  const png = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.dictionary);
  if (!png.writeToFileAtomically($(argv[1]), true)) throw new Error("Could not write icon");
}
`;

type SystemIconRenderer = (appPath: string, outputPath: string) => Promise<void>;

async function renderSystemIcon(appPath: string, outputPath: string): Promise<void> {
  await run("/usr/bin/osascript", ["-l", "JavaScript", "-e", SYSTEM_ICON_SCRIPT, appPath, outputPath], {
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
  await run("/usr/bin/sips", ["-Z", String(ICON_SIZE), outputPath], { timeout: 10000 });
}

interface CachedIcon {
  version: number;
  bundleSignature: string;
  source: string;
  sourceSignature: string;
  image: string;
}

async function signature(path: string): Promise<string> {
  const file = await stat(path);
  return `${file.mtimeMs}:${file.ctimeMs}:${file.size}`;
}

/** Resolve only explicitly declared app icons, never an arbitrary document icon. */
export function iconCandidates(resources: string, metadata: Record<string, unknown>): string[] {
  const root = resolve(resources);
  const candidates = new Set<string>();
  for (const key of ["CFBundleIconFile", "CFBundleIconName"]) {
    const name = metadata[key];
    if (typeof name !== "string" || !name.trim()) continue;
    const path = resolve(root, name);
    if (!path.startsWith(`${root}${sep}`)) continue;
    candidates.add(path.endsWith(".icns") ? path : `${path}.icns`);
  }
  return [...candidates];
}

export function isUsableApplicationIcon(data: Buffer): boolean {
  if (!(
    data.length >= 24 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    data.toString("ascii", 12, 16) === "IHDR" &&
    data.readUInt32BE(16) >= 256 &&
    data.readUInt32BE(20) >= 256
  ))
    return false;
  try {
    const image = PNG.sync.read(data);
    // Some modern macOS apps ship a correctly sized but fully transparent ICNS.
    for (let offset = 3; offset < image.data.length; offset += 4) {
      if (image.data[offset] > 0) return true;
    }
  } catch {
    // A header alone does not make a valid image.
  }
  return false;
}

function imagePath(directory: string, key: string, source: string, sourceSignature: string): string {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([CACHE_VERSION, source, sourceSignature]))
    .digest("hex");
  return join(directory, `${key}-${fingerprint}.png`);
}

/**
 * Read the app bundle's full-resolution icon, resolving through AppKit if needed.
 * Missing/unsupported icons return undefined so views can use their fallback icons.
 */
export async function applicationIcon(
  appPath: string,
  directory: string,
  renderNative: SystemIconRenderer = renderSystemIcon,
): Promise<string | undefined> {
  let temporaryImage: string | undefined;
  let temporaryMetadata: string | undefined;
  try {
    const plist = join(appPath, "Contents", "Info.plist");
    const resources = join(appPath, "Contents", "Resources");
    const bundleSignature = `${await signature(appPath)}:${await signature(plist)}`;
    const key = createHash("sha256").update(appPath).digest("hex");
    const metadataPath = join(directory, `${key}.json`);
    try {
      const cached: CachedIcon = JSON.parse(await readFile(metadataPath, "utf8"));
      if (
        cached.version === CACHE_VERSION &&
        cached.bundleSignature === bundleSignature &&
        cached.sourceSignature === (await signature(cached.source)) &&
        cached.image === imagePath(directory, key, cached.source, cached.sourceSignature) &&
        isUsableApplicationIcon(await readFile(cached.image))
      ) {
        return cached.image;
      }
    } catch {
      // Cache misses, corrupt cache entries, and app updates are regenerated.
    }

    const { stdout } = await run("/usr/bin/plutil", ["-convert", "json", "-o", "-", plist], {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
    const metadata: Record<string, unknown> = JSON.parse(stdout);
    for (const source of iconCandidates(resources, metadata)) {
      try {
        const sourceSignature = await signature(source);
        const image = imagePath(directory, key, source, sourceSignature);
        await mkdir(directory, { recursive: true });
        temporaryImage = join(directory, `${key}-${randomUUID()}.png`);
        await run("/usr/bin/sips", ["-s", "format", "png", "-Z", String(ICON_SIZE), source, "--out", temporaryImage], {
          timeout: 10000,
          maxBuffer: 1024 * 1024,
        });
        if (!isUsableApplicationIcon(await readFile(temporaryImage))) continue;
        await rename(temporaryImage, image);
        temporaryImage = undefined;
        const record: CachedIcon = { version: CACHE_VERSION, bundleSignature, source, sourceSignature, image };
        temporaryMetadata = `${metadataPath}.${randomUUID()}.tmp`;
        await writeFile(temporaryMetadata, JSON.stringify(record));
        await rename(temporaryMetadata, metadataPath);
        temporaryMetadata = undefined;
        return image;
      } catch {
        // Try the alternate declared icon before using the system resolver.
      } finally {
        if (temporaryImage) await rm(temporaryImage, { force: true }).catch(() => undefined);
        temporaryImage = undefined;
      }
    }

    // Modern icons may live in Assets.car instead of the declared legacy ICNS.
    // Let the system choose the actual application icon, then validate its pixels.
    let source = join(resources, "Assets.car");
    let sourceSignature: string;
    try {
      sourceSignature = await signature(source);
    } catch {
      source = plist;
      sourceSignature = await signature(source);
    }
    const image = imagePath(directory, key, source, sourceSignature);
    await mkdir(directory, { recursive: true });
    temporaryImage = join(directory, `${key}-${randomUUID()}.png`);
    await renderNative(appPath, temporaryImage);
    if (!isUsableApplicationIcon(await readFile(temporaryImage))) return undefined;
    await rename(temporaryImage, image);
    temporaryImage = undefined;
    const record: CachedIcon = { version: CACHE_VERSION, bundleSignature, source, sourceSignature, image };
    temporaryMetadata = `${metadataPath}.${randomUUID()}.tmp`;
    await writeFile(temporaryMetadata, JSON.stringify(record));
    await rename(temporaryMetadata, metadataPath);
    temporaryMetadata = undefined;
    return image;
  } catch {
    // App removal, inaccessible bundles, or a read-only cache must not break discovery.
  } finally {
    if (temporaryImage) await rm(temporaryImage, { force: true }).catch(() => undefined);
    if (temporaryMetadata) await rm(temporaryMetadata, { force: true }).catch(() => undefined);
  }
  return undefined;
}

/** Bound native conversions so the launcher remains responsive on first open. */
export async function loadApplicationIcons(
  paths: string[],
  directory: string,
  onIcon: (appPath: string, image: string | undefined) => void,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, paths.length) }, async () => {
      while (next < paths.length && !signal?.aborted) {
        const path = paths[next++];
        const image = await applicationIcon(path, directory);
        if (!signal?.aborted) onIcon(path, image);
      }
    }),
  );
}

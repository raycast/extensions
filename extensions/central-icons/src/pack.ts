import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const PACKAGE = "@central-icons-react/all";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE.replace("/", "%2F")}/latest`;

const execFileAsync = promisify(execFile);

const packRoot = join(environment.supportPath, "pack");
const versionFile = join(environment.supportPath, "version");

export interface Pack {
  version: string;
  dir: string;
  cacheDir: string;
}

interface RegistryDist {
  tarball: string;
  /** Subresource-integrity string, e.g. "sha512-<base64>". */
  integrity?: string;
  /** Legacy sha1 hex digest, still published alongside `integrity`. */
  shasum?: string;
}

interface RegistryLatest {
  version: string;
  dist: RegistryDist;
}

/**
 * Checks the downloaded tarball against the checksum the registry published for
 * it, before anything is extracted and before `build-cache.js` requires any code
 * out of it. A tarball that does not match what the registry metadata describes
 * is discarded.
 */
function verifyIntegrity(bytes: Buffer, dist: RegistryDist): void {
  if (dist.integrity) {
    // "sha512-<base64>" — split on the first dash only; SRI uses standard
    // base64, whose alphabet has no dash.
    const dash = dist.integrity.indexOf("-");
    const algorithm = dist.integrity.slice(0, dash);
    const expected = dist.integrity.slice(dash + 1);
    const actual = createHash(algorithm).update(bytes).digest("base64");
    if (actual !== expected) {
      throw new Error("Downloaded icons failed their integrity check and were discarded.");
    }
    return;
  }
  if (dist.shasum) {
    const actual = createHash("sha1").update(bytes).digest("hex");
    if (actual !== dist.shasum) {
      throw new Error("Downloaded icons failed their integrity check and were discarded.");
    }
    return;
  }
  throw new Error("The registry did not publish a checksum for this release, so it was not installed.");
}

function currentVersion(): string | undefined {
  try {
    return readFileSync(versionFile, "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

function packFor(version: string): Pack {
  const dir = join(packRoot, version);
  return { version, dir, cacheDir: join(dir, "cache") };
}

function isComplete(pack: Pack): boolean {
  return existsSync(join(pack.cacheDir, "metadata.json"));
}

async function fetchLatest(): Promise<RegistryLatest | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(REGISTRY_URL, { signal: controller.signal });
    if (!response.ok) return undefined;
    return (await response.json()) as RegistryLatest;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export type PackProgress = (message: string) => void;

async function downloadAndExtract(dist: RegistryDist, dir: string, onProgress?: PackProgress): Promise<void> {
  const response = await fetch(dist.tarball);
  if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`);
  const archive = join(dir, "package.tgz");

  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body) throw new Error("Download failed (empty response)");
  const chunks: Buffer[] = [];
  let received = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
    received += value.length;
    onProgress?.(
      total > 0
        ? `Downloading icons… ${Math.round((received / total) * 100)}%`
        : `Downloading icons… ${(received / 1e6).toFixed(1)} MB`,
    );
  }
  const bytes = Buffer.concat(chunks);
  verifyIntegrity(bytes, dist);
  writeFileSync(archive, bytes);

  // bsdtar (ships with macOS) extracts the npm tarball; npm lifecycle
  // scripts like the package's preinstall license check are NOT run.
  // Only the icon data is extracted — the package's 110MB of sourcemaps
  // and component code are not needed.
  onProgress?.("Extracting icons…");
  await execFileAsync("/usr/bin/tar", [
    "-xzf",
    archive,
    "-C",
    dir,
    "package/icons/index.js",
    "package/icons-index.json",
  ]);
  rmSync(archive, { force: true });
  // npm tarballs nest everything under a "package/" root — flatten it.
  renameSync(join(dir, "package/icons"), join(dir, "icons"));
  renameSync(join(dir, "package/icons-index.json"), join(dir, "icons-index.json"));
  rmSync(join(dir, "package"), { recursive: true, force: true });
}

/** Splits the package's centralIcons record into per-variant gzipped JSON
 *  files plus a metadata.json. Runs in a separate Node process: icons/index.js
 *  is ~52MB and would blow past the Raycast worker's memory limit. */
async function buildCache(pack: Pack): Promise<void> {
  await execFileAsync(process.execPath, [join(environment.assetsPath, "build-cache.js"), pack.dir, pack.cacheDir], {
    maxBuffer: 4 * 1024 * 1024,
  });
}

let inflight: Promise<{ pack: Pack; updated: boolean }> | null = null;

/**
 * Returns the local icon pack, downloading the latest version from npm if it
 * changed since the last launch. Falls back to the existing pack when offline.
 * Throws only when there is no usable pack at all (first run without network).
 * Concurrent calls share a single in-flight download (React 18 dev mode
 * double-invokes effects, which would otherwise start two downloads).
 */
export function ensurePack(onProgress?: PackProgress): Promise<{ pack: Pack; updated: boolean }> {
  inflight ??= ensurePackInner(onProgress).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function ensurePackInner(onProgress?: PackProgress): Promise<{ pack: Pack; updated: boolean }> {
  const current = currentVersion();
  const latest = await fetchLatest();

  if (current && (!latest || latest.version === current)) {
    const pack = packFor(current);
    if (isComplete(pack)) return { pack, updated: false };
  }
  if (!latest) {
    if (current) {
      const pack = packFor(current);
      if (isComplete(pack)) return { pack, updated: false };
    }
    throw new Error("Could not download icons. Please check your internet connection.");
  }

  const pack = packFor(latest.version);
  rmSync(pack.dir, { recursive: true, force: true });
  mkdirSync(pack.dir, { recursive: true });
  await downloadAndExtract(latest.dist, pack.dir, onProgress);
  onProgress?.("Preparing icons…");
  await buildCache(pack);

  for (const entry of readdirSync(packRoot)) {
    if (entry !== latest.version) rmSync(join(packRoot, entry), { recursive: true, force: true });
  }
  writeFileSync(versionFile, latest.version);
  return { pack, updated: current !== latest.version };
}

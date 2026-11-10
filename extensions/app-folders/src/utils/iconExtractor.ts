import { environment } from "@raycast/api";
import { exec, execFile, execSync } from "child_process";
import crypto from "crypto";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { Folder } from "../types";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// In-memory icon caches (0ms diskless lookups during the active session)
const inMemoryIconCache = new Map<string, string>();
const inMemoryFolderPreviewCache = new Map<string, string>();

// Built-in asset icons
const BUILTIN_ASSET_ICONS = new Set([
  "default_folder.png",
  "glass_folder.png",
  "microsoft.png",
  "icon.png",
]);

/**
 * Checks if a folder icon value is a custom image file or asset.
 */
export function isCustomIconFile(iconValue?: string): boolean {
  if (!iconValue) return false;
  return (
    iconValue.startsWith("/") ||
    /\.(ico|icns|png|jpg|jpeg|webp|svg)$/i.test(iconValue)
  );
}

/**
 * Computes the cached app icon PNG path in the support directory.
 */
function getCachedPngPath(appPath: string): string {
  const cacheDir = path.join(environment.supportPath, "cached_app_icons");
  const pathHash = crypto.createHash("md5").update(appPath).digest("hex");
  return path.join(cacheDir, `${pathHash}.png`);
}

/**
 * Synchronously discovers the .icns file inside an .app bundle.
 */
function findAppIcnsSync(appPath: string): string | null {
  const resourcesDir = path.join(appPath, "Contents", "Resources");
  if (!fsSync.existsSync(resourcesDir)) return null;

  const plistPath = path.join(appPath, "Contents", "Info.plist");
  try {
    if (fsSync.existsSync(plistPath)) {
      const iconName = execSync(
        `plutil -extract CFBundleIconFile raw "${plistPath}" 2>/dev/null || true`,
        { encoding: "utf8" },
      ).trim();
      if (iconName) {
        const fullIconName = iconName.endsWith(".icns")
          ? iconName
          : `${iconName}.icns`;
        const candidate = path.join(resourcesDir, fullIconName);
        if (fsSync.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch {
    // Fallback to directory scan if Info.plist parsing fails
  }

  try {
    const files = fsSync.readdirSync(resourcesDir);
    const firstIcns = files.find((f) => f.endsWith(".icns"));
    if (firstIcns) {
      return path.join(resourcesDir, firstIcns);
    }
  } catch {
    // Ignore directory read failure
  }

  return null;
}

/**
 * Returns a high-res (512x512) cached app icon synchronously.
 * If not cached, performs synchronous extraction so the first frame renders without layout jitter.
 */
export function getHighResAppIconSync(appPath: string): string | null {
  if (inMemoryIconCache.has(appPath)) {
    return inMemoryIconCache.get(appPath)!;
  }

  const cachedPngPath = getCachedPngPath(appPath);
  try {
    if (fsSync.existsSync(cachedPngPath)) {
      inMemoryIconCache.set(appPath, cachedPngPath);
      return cachedPngPath;
    }

    const cacheDir = path.join(environment.supportPath, "cached_app_icons");
    fsSync.mkdirSync(cacheDir, { recursive: true });

    const icnsPath = findAppIcnsSync(appPath);
    if (icnsPath) {
      execSync(
        `sips -s format png -z 512 512 "${icnsPath}" --out "${cachedPngPath}" >/dev/null 2>&1`,
      );
      if (fsSync.existsSync(cachedPngPath)) {
        inMemoryIconCache.set(appPath, cachedPngPath);
        return cachedPngPath;
      }
    }
  } catch {
    // Fall back to async NSWorkspace extraction
  }
  return null;
}

/**
 * Extracts and caches a 512x512 PNG icon from an .app bundle.
 * Handles both .icns apps and Assets.car apps via NSWorkspace fallback.
 */
export async function getHighResAppIcon(
  appPath: string,
): Promise<string | null> {
  const syncCached = getHighResAppIconSync(appPath);
  if (syncCached) return syncCached;

  try {
    const cacheDir = path.join(environment.supportPath, "cached_app_icons");
    await fs.mkdir(cacheDir, { recursive: true });
    const cachedPngPath = getCachedPngPath(appPath);

    const escapedApp = appPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const escapedOut = cachedPngPath
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    const jxaScript = `
      ObjC.import("AppKit");
      const ws = $.NSWorkspace.sharedWorkspace;
      const icon = ws.iconForFile("${escapedApp}");
      icon.setSize($.NSMakeSize(512, 512));
      const tiff = icon.TIFFRepresentation;
      const rep = $.NSBitmapImageRep.imageRepWithData(tiff);
      const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
      png.writeToFileAtomically("${escapedOut}", true);
    `;
    await execAsync(
      `osascript -l JavaScript -e '${jxaScript}' >/dev/null 2>&1`,
    );
    await execAsync(
      `sips -s format png -z 512 512 "${cachedPngPath}" --out "${cachedPngPath}" >/dev/null 2>&1`,
    );

    if (fsSync.existsSync(cachedPngPath)) {
      inMemoryIconCache.set(appPath, cachedPngPath);
      return cachedPngPath;
    }
  } catch {
    // Return null on failure
  }
  return null;
}

/**
 * Normalizes and caches a custom folder icon (.ico, .icns, .png, etc.) to 512x512 PNG.
 */
export async function prepareCustomFolderIcon(
  filePath: string,
): Promise<string> {
  if (!filePath || BUILTIN_ASSET_ICONS.has(filePath)) {
    return filePath || "📁";
  }

  try {
    await fs.access(filePath);
    const cacheDir = path.join(environment.supportPath, "custom_folder_icons");
    await fs.mkdir(cacheDir, { recursive: true });

    const stat = await fs.stat(filePath);
    const hashInput = `${filePath}_${stat.mtimeMs}`;
    const fileHash = crypto.createHash("md5").update(hashInput).digest("hex");
    const destPngPath = path.join(cacheDir, `folder_icon_${fileHash}.png`);

    if (fsSync.existsSync(destPngPath)) {
      return destPngPath;
    }

    await execAsync(
      `sips -s format png -z 512 512 "${filePath}" --out "${destPngPath}" >/dev/null 2>&1`,
    );

    if (fsSync.existsSync(destPngPath)) {
      return destPngPath;
    }
  } catch {
    if (fsSync.existsSync(filePath)) {
      return filePath;
    }
  }

  return filePath;
}

/**
 * Computes the cache path for a folder's 2x2 live preview thumbnail.
 */
function getFolderPreviewPath(folder: Folder): string {
  const previewDir = path.join(environment.supportPath, "folder_previews");
  const firstFourApps = (folder.apps || [])
    .slice(0, 4)
    .map((a) => a.path)
    .join(",");
  const hash = crypto
    .createHash("md5")
    .update(`${folder.id}_${firstFourApps}_v2`)
    .digest("hex");
  return path.join(previewDir, `preview_box_${hash}.png`);
}

/**
 * Synchronously checks if a 2x2 folder thumbnail is already cached on disk.
 */
export function getFolderPreviewIconSync(folder: Folder): string | null {
  if (inMemoryFolderPreviewCache.has(folder.id)) {
    const cached = inMemoryFolderPreviewCache.get(folder.id)!;
    if (fsSync.existsSync(cached)) return cached;
  }

  const previewPath = getFolderPreviewPath(folder);
  try {
    if (fsSync.existsSync(previewPath)) {
      inMemoryFolderPreviewCache.set(folder.id, previewPath);
      return previewPath;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Generates an iOS/Launchpad-style 512x512 translucent squircle thumbnail containing up to 4 mini app icons.
 */
export async function generateFolderPreviewIcon(
  folder: Folder,
): Promise<string | null> {
  if (!folder.apps || folder.apps.length === 0) return null;

  const existing = getFolderPreviewIconSync(folder);
  if (existing) return existing;

  try {
    const previewDir = path.join(environment.supportPath, "folder_previews");
    await fs.mkdir(previewDir, { recursive: true });
    const previewPath = getFolderPreviewPath(folder);

    const bgAssetPath = path.join(environment.assetsPath, "glass_folder.png");

    const appIconPaths: string[] = [];
    for (const app of folder.apps.slice(0, 4)) {
      let iconP = getHighResAppIconSync(app.path);
      if (!iconP) {
        iconP = await getHighResAppIcon(app.path);
      }
      if (iconP && fsSync.existsSync(iconP)) {
        appIconPaths.push(iconP);
      }
    }

    if (appIconPaths.length === 0) return null;

    const jxaScript = `
ObjC.import("AppKit");
function run(argv) {
  const data = JSON.parse(argv[0]);
  const canvas = $.NSImage.alloc.initWithSize($.NSMakeSize(512, 512));
  canvas.lockFocus;
  const ctx = $.NSGraphicsContext.currentContext;
  ctx.setImageInterpolation($.NSImageInterpolationHigh);

  if (data.glass_path && $.NSFileManager.defaultManager.fileExistsAtPath(data.glass_path)) {
    const bg = $.NSImage.alloc.initWithContentsOfFile(data.glass_path);
    if (bg) bg.drawInRect($.NSMakeRect(0, 0, 512, 512));
  }

  const n = data.icon_paths.length;
  let rects = [];
  if (n === 1) {
    rects = [$.NSMakeRect(126, 126, 260, 260)];
  } else if (n === 2) {
    rects = [$.NSMakeRect(72, 168, 176, 176), $.NSMakeRect(264, 168, 176, 176)];
  } else if (n === 3) {
    rects = [$.NSMakeRect(72, 264, 176, 176), $.NSMakeRect(264, 264, 176, 176), $.NSMakeRect(72, 72, 176, 176)];
  } else {
    rects = [$.NSMakeRect(72, 264, 176, 176), $.NSMakeRect(264, 264, 176, 176), $.NSMakeRect(72, 72, 176, 176), $.NSMakeRect(264, 72, 176, 176)];
  }

  const ws = $.NSWorkspace.sharedWorkspace;
  for (let i = 0; i < Math.min(n, rects.length); i++) {
    const p = data.icon_paths[i];
    let icon = null;
    if (p.endsWith(".png") && $.NSFileManager.defaultManager.fileExistsAtPath(p)) {
      icon = $.NSImage.alloc.initWithContentsOfFile(p);
    } else if ($.NSFileManager.defaultManager.fileExistsAtPath(p)) {
      icon = ws.iconForFile(p);
    }
    if (icon) {
      icon.drawInRect(rects[i]);
    }
  }

  canvas.unlockFocus;
  const tiff = canvas.TIFFRepresentation;
  const rep = $.NSBitmapImageRep.imageRepWithData(tiff);
  const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
  png.writeToFileAtomically(data.out_path, true);
}
`;

    const inputData = JSON.stringify({
      glass_path: bgAssetPath,
      out_path: previewPath,
      icon_paths: appIconPaths,
    });

    await execFileAsync("osascript", [
      "-l",
      "JavaScript",
      "-e",
      jxaScript,
      inputData,
    ]);

    if (fsSync.existsSync(previewPath)) {
      inMemoryFolderPreviewCache.set(folder.id, previewPath);
      return previewPath;
    }
  } catch {
    // Fall back to glass_folder.png
  }
  return null;
}

/**
 * Resolves a single icon string to a Raycast image source.
 */
function resolveSingleIconSource(iconValue?: string): { source: string } {
  if (!iconValue || !isCustomIconFile(iconValue)) {
    return { source: "glass_folder.png" };
  }

  if (BUILTIN_ASSET_ICONS.has(iconValue)) {
    return { source: iconValue };
  }

  if (iconValue.startsWith("/")) {
    if (!fsSync.existsSync(iconValue)) {
      return { source: "glass_folder.png" };
    }

    if (/\.(ico|icns)$/i.test(iconValue)) {
      try {
        const cacheDir = path.join(
          environment.supportPath,
          "custom_folder_icons",
        );
        fsSync.mkdirSync(cacheDir, { recursive: true });
        const fileHash = crypto
          .createHash("md5")
          .update(iconValue)
          .digest("hex");
        const convertedPath = path.join(
          cacheDir,
          `folder_icon_${fileHash}.png`,
        );
        if (!fsSync.existsSync(convertedPath)) {
          execSync(
            `sips -s format png -z 512 512 "${iconValue}" --out "${convertedPath}" >/dev/null 2>&1`,
          );
        }
        if (fsSync.existsSync(convertedPath)) {
          return { source: convertedPath };
        }
      } catch {
        return { source: "glass_folder.png" };
      }
    }

    return { source: iconValue };
  }

  return { source: "glass_folder.png" };
}

/**
 * Returns a safe image source for rendering a folder in Raycast.
 * 1. Custom image if specified
 * 2. Classic default_folder.png if previewStyle === "plain"
 * 3. 2x2 live preview if apps are present
 * 4. Fallback to translucent glass box
 */
export function getFolderIconSource(folderOrIcon?: Folder | string): {
  source: string;
} {
  if (!folderOrIcon) {
    return { source: "glass_folder.png" };
  }

  if (typeof folderOrIcon === "string") {
    return resolveSingleIconSource(folderOrIcon);
  }

  const folder = folderOrIcon;

  // 1. User specified a custom image file
  if (folder.icon && isCustomIconFile(folder.icon)) {
    return resolveSingleIconSource(folder.icon);
  }

  // 2. Classic plain folder explicitly selected
  if (folder.previewStyle === "plain") {
    return { source: "default_folder.png" };
  }

  // 3. Empty folder without apps -> translucent glass squircle
  if (!folder.apps || folder.apps.length === 0) {
    return { source: "glass_folder.png" };
  }

  // 4. Folder with apps -> return cached 2x2 preview synchronously
  const syncPreview = getFolderPreviewIconSync(folder);
  if (syncPreview) {
    return { source: syncPreview };
  }

  // Generate in background on first frame while showing glass_folder.png
  generateFolderPreviewIcon(folder);
  return { source: "glass_folder.png" };
}

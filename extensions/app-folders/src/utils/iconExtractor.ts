import { environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import crypto from "crypto";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { Folder } from "../types";

const execFileAsync = promisify(execFile);

// In-memory icon caches (0ms diskless lookups during the active session)
const inMemoryIconCache = new Map<string, string>();
const inMemoryFolderPreviewCache = new Map<string, string>();

// Deduplication maps for in-flight async icon extraction and preview generation
const pendingIconPromises = new Map<string, Promise<string | null>>();
const pendingPreviewPromises = new Map<string, Promise<string | null>>();

// Bounded concurrency queue for app icon extraction
const MAX_CONCURRENT_TASKS = 2;
let activeTaskCount = 0;
const taskQueue: Array<() => void> = [];

function runWithConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const execute = () => {
      activeTaskCount += 1;
      fn()
        .then(resolve, reject)
        .finally(() => {
          activeTaskCount -= 1;
          const next = taskQueue.shift();
          if (next) next();
        });
    };

    if (activeTaskCount < MAX_CONCURRENT_TASKS) {
      execute();
    } else {
      taskQueue.push(execute);
    }
  });
}

// Separate bounded concurrency queue for folder preview compositions
const MAX_CONCURRENT_PREVIEWS = 2;
let activePreviewCount = 0;
const previewTaskQueue: Array<() => void> = [];

function runWithPreviewConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const execute = () => {
      activePreviewCount += 1;
      fn()
        .then(resolve, reject)
        .finally(() => {
          activePreviewCount -= 1;
          const next = previewTaskQueue.shift();
          if (next) next();
        });
    };

    if (activePreviewCount < MAX_CONCURRENT_PREVIEWS) {
      execute();
    } else {
      previewTaskQueue.push(execute);
    }
  });
}

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
 * Asynchronously discovers the .icns file inside an .app bundle without shell interpolation.
 */
async function findAppIcnsAsync(appPath: string): Promise<string | null> {
  const resourcesDir = path.join(appPath, "Contents", "Resources");
  if (!fsSync.existsSync(resourcesDir)) return null;

  const plistPath = path.join(appPath, "Contents", "Info.plist");
  try {
    if (fsSync.existsSync(plistPath)) {
      const { stdout } = await execFileAsync("plutil", [
        "-extract",
        "CFBundleIconFile",
        "raw",
        plistPath,
      ]);
      const iconName = stdout.trim();
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
    const files = await fs.readdir(resourcesDir);
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
 * Returns a high-res (512x512) cached app icon synchronously if already cached on disk.
 * Never spawns child processes during render to keep UI responsive.
 */
export function getHighResAppIconSync(appPath: string): string | null {
  if (inMemoryIconCache.has(appPath)) {
    const mem = inMemoryIconCache.get(appPath)!;
    if (fsSync.existsSync(mem)) {
      return mem;
    }
  }

  const cachedPngPath = getCachedPngPath(appPath);
  try {
    if (fsSync.existsSync(cachedPngPath)) {
      inMemoryIconCache.set(appPath, cachedPngPath);
      return cachedPngPath;
    }
  } catch {
    // Ignore read error
  }
  return null;
}

/**
 * Extracts and caches a 512x512 PNG icon from an .app bundle asynchronously.
 * Deduplicates concurrent requests for the same appPath and limits process concurrency.
 */
export async function getHighResAppIcon(
  appPath: string,
): Promise<string | null> {
  const syncCached = getHighResAppIconSync(appPath);
  if (syncCached) return syncCached;

  const existingPromise = pendingIconPromises.get(appPath);
  if (existingPromise) return existingPromise;

  const promise = runWithConcurrencyLimit(async () => {
    try {
      const recheck = getHighResAppIconSync(appPath);
      if (recheck) return recheck;

      if (!fsSync.existsSync(appPath)) return null;

      const cacheDir = path.join(environment.supportPath, "cached_app_icons");
      await fs.mkdir(cacheDir, { recursive: true });
      const cachedPngPath = getCachedPngPath(appPath);

      // 1. Fast path: convert .icns directly via sips using argument array
      const icnsPath = await findAppIcnsAsync(appPath);
      if (icnsPath) {
        try {
          await execFileAsync("sips", [
            "-s",
            "format",
            "png",
            "-z",
            "512",
            "512",
            icnsPath,
            "--out",
            cachedPngPath,
          ]);
          if (fsSync.existsSync(cachedPngPath)) {
            inMemoryIconCache.set(appPath, cachedPngPath);
            return cachedPngPath;
          }
        } catch {
          // Fall through to NSWorkspace extraction
        }
      }

      // 2. Fallback for Assets.car bundles: pass paths as argv to fixed JXA script via runAppleScript
      const jxaScript = `
ObjC.import("AppKit");
function run(argv) {
  const targetApp = argv[0];
  const outputPng = argv[1];
  const ws = $.NSWorkspace.sharedWorkspace;
  const icon = ws.iconForFile(targetApp);
  icon.setSize($.NSMakeSize(512, 512));
  const tiff = icon.TIFFRepresentation;
  const rep = $.NSBitmapImageRep.imageRepWithData(tiff);
  const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
  png.writeToFileAtomically(outputPng, true);
}
`;
      await runAppleScript(jxaScript, [appPath, cachedPngPath], {
        language: "JavaScript",
      });
      await execFileAsync("sips", [
        "-s",
        "format",
        "png",
        "-z",
        "512",
        "512",
        cachedPngPath,
        "--out",
        cachedPngPath,
      ]);

      if (fsSync.existsSync(cachedPngPath)) {
        inMemoryIconCache.set(appPath, cachedPngPath);
        return cachedPngPath;
      }
    } catch {
      // Return null on failure
    }
    return null;
  }).finally(() => {
    pendingIconPromises.delete(appPath);
  });

  pendingIconPromises.set(appPath, promise);
  return promise;
}

/**
 * Computes the deterministic converted PNG path for a custom folder icon file.
 */
function getCustomFolderIconCachePath(
  filePath: string,
  mtimeMs?: number,
): string {
  const cacheDir = path.join(environment.supportPath, "custom_folder_icons");
  const hashInput = mtimeMs !== undefined ? `${filePath}_${mtimeMs}` : filePath;
  const fileHash = crypto.createHash("md5").update(hashInput).digest("hex");
  return path.join(cacheDir, `folder_icon_${fileHash}.png`);
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
    const destPngPath = getCustomFolderIconCachePath(filePath, stat.mtimeMs);

    if (fsSync.existsSync(destPngPath)) {
      return destPngPath;
    }

    await execFileAsync("sips", [
      "-s",
      "format",
      "png",
      "-z",
      "512",
      "512",
      filePath,
      "--out",
      destPngPath,
    ]);

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
 * Synchronously checks if the current 2x2 folder thumbnail is already cached on disk.
 * Keyed by the full previewPath so changes to the folder's apps immediately invalidate old previews.
 */
export function getFolderPreviewIconSync(folder: Folder): string | null {
  const previewPath = getFolderPreviewPath(folder);

  if (inMemoryFolderPreviewCache.has(previewPath)) {
    const cached = inMemoryFolderPreviewCache.get(previewPath)!;
    if (fsSync.existsSync(cached)) return cached;
  }

  try {
    if (fsSync.existsSync(previewPath)) {
      inMemoryFolderPreviewCache.set(previewPath, previewPath);
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

  const previewPath = getFolderPreviewPath(folder);
  const pending = pendingPreviewPromises.get(previewPath);
  if (pending) return pending;

  // Resolve/extract high-res app icons first, outside the preview queue lock to prevent deadlock
  const task = async (): Promise<string | null> => {
    try {
      const recheck = getFolderPreviewIconSync(folder);
      if (recheck) return recheck;

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

      // Acquire dedicated preview slot to compose the 2x2 preview icon
      return await runWithPreviewConcurrencyLimit(async () => {
        const recheckInside = getFolderPreviewIconSync(folder);
        if (recheckInside) return recheckInside;

        const previewDir = path.join(
          environment.supportPath,
          "folder_previews",
        );
        await fs.mkdir(previewDir, { recursive: true });

        const bgAssetPath = path.join(
          environment.assetsPath,
          "glass_folder.png",
        );

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

        await runAppleScript(jxaScript, [inputData], {
          language: "JavaScript",
        });

        if (fsSync.existsSync(previewPath)) {
          inMemoryFolderPreviewCache.set(previewPath, previewPath);
          return previewPath;
        }
        return null;
      });
    } catch {
      // Fall back to glass_folder.png
      return null;
    }
  };

  const promise = task().finally(() => {
    pendingPreviewPromises.delete(previewPath);
  });

  pendingPreviewPromises.set(previewPath, promise);
  return promise;
}

/**
 * Shared bounded warm-up helper for folders and their contained apps.
 * Deduplicates app paths and runs through the bounded concurrency queue.
 */
export async function prewarmFoldersIcons(folders: Folder[]): Promise<boolean> {
  let anyUpdated = false;
  const uniqueAppPaths = new Set<string>();

  for (const folder of folders) {
    for (const app of folder.apps) {
      if (!getHighResAppIconSync(app.path)) {
        uniqueAppPaths.add(app.path);
      }
    }
  }

  if (uniqueAppPaths.size > 0) {
    const results = await Promise.all(
      Array.from(uniqueAppPaths).map((appPath) => getHighResAppIcon(appPath)),
    );
    if (results.some(Boolean)) {
      anyUpdated = true;
    }
  }

  for (const folder of folders) {
    if (
      folder.previewStyle !== "plain" &&
      (!folder.icon || !isCustomIconFile(folder.icon)) &&
      folder.apps &&
      folder.apps.length > 0
    ) {
      if (!getFolderPreviewIconSync(folder)) {
        const preview = await generateFolderPreviewIcon(folder);
        if (preview) {
          anyUpdated = true;
        }
      }
    }
  }

  return anyUpdated;
}

/**
 * Resolves a single icon string to a Raycast image source without blocking render.
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
      const convertedPath = getCustomFolderIconCachePath(iconValue);
      if (fsSync.existsSync(convertedPath)) {
        return { source: convertedPath };
      }
      // Convert asynchronously in background without blocking render
      void execFileAsync("sips", [
        "-s",
        "format",
        "png",
        "-z",
        "512",
        "512",
        iconValue,
        "--out",
        convertedPath,
      ]).catch(() => {});
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
  void generateFolderPreviewIcon(folder);
  return { source: "glass_folder.png" };
}

import { environment } from "@raycast/api";
import { exec } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const ICON_CACHE_DIR = join(environment.supportPath, "folder-icons");
const CELL_SIZE = 32;
const GRID_COLS = 3;
const MAX_ICONS = 9;

function ensureCacheDir() {
  if (!existsSync(ICON_CACHE_DIR)) {
    mkdirSync(ICON_CACHE_DIR, { recursive: true });
  }
}

/**
 * Generate a cache key from the first 9 app paths in a folder.
 */
function cacheKey(appPaths: string[]): string {
  const key = appPaths.slice(0, MAX_ICONS).join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return `folder_${(hash >>> 0).toString(16)}.png`;
}

/**
 * Generate a composite folder icon showing a 3x3 grid of app icons.
 * Uses macOS-native osascript (JXA) with AppKit — no external dependencies.
 * Returns the file path to the generated PNG.
 */
export async function generateFolderIcon(appPaths: string[]): Promise<string | null> {
  if (appPaths.length === 0) return null;

  ensureCacheDir();

  const filename = cacheKey(appPaths);
  const outputPath = join(ICON_CACHE_DIR, filename);

  if (existsSync(outputPath)) {
    return outputPath;
  }

  const paths = appPaths.slice(0, MAX_ICONS);
  const gridSize = CELL_SIZE * GRID_COLS;

  const appsJson = JSON.stringify(paths);
  const script = `
ObjC.import("AppKit");
var ws = $.NSWorkspace.sharedWorkspace;
var apps = ${appsJson};
var cellSize = ${CELL_SIZE};
var gridSize = ${gridSize};
var image = $.NSImage.alloc.initWithSize($.NSMakeSize(gridSize, gridSize));
image.lockFocus;
for (var i = 0; i < apps.length; i++) {
  var icon = ws.iconForFile(apps[i]);
  var col = i % ${GRID_COLS};
  var row = ${GRID_COLS - 1} - Math.floor(i / ${GRID_COLS});
  var rect = $.NSMakeRect(col * cellSize, row * cellSize, cellSize, cellSize);
  icon.drawInRectFromRectOperationFraction(rect, $.NSZeroRect, $.NSCompositingOperationSourceOver, 1.0);
}
image.unlockFocus;
var tiffData = image.TIFFRepresentation;
var bitmap = $.NSBitmapImageRep.imageRepWithData(tiffData);
var pngData = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
pngData.writeToFileAtomically(${JSON.stringify(outputPath)}, true);
${JSON.stringify(outputPath)};
`;

  return new Promise((resolve) => {
    exec(`osascript -l JavaScript -e ${escapeShellArg(script)}`, { encoding: "utf-8", timeout: 10000 }, (error) => {
      resolve(error ? null : outputPath);
    });
  });
}

function escapeShellArg(arg: string): string {
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

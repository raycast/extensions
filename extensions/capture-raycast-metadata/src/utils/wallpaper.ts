import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type Frame = { x: number; y: number; w: number; h: number };

export type Canvas = { width: number; height: number; paddingX: number; paddingY: number };

// runAppleScript reads the script from stdin ("-"), so every later argument, a negative coordinate
// included, reaches run(argv) rather than parsing as an option.
const runJXA = async (script: string, args: (string | number)[]) =>
  (await runAppleScript(script, args.map(String), { language: "JavaScript" })).trim();

/** The Core Graphics window number of the Raycast window at `frame`, which `screencapture -l` needs. */
const WINDOW_NUMBER_SCRIPT = `
ObjC.import("CoreGraphics");
function run(argv) {
  const [x, y, w, h] = argv.map(Number);
  const list = ObjC.deepUnwrap(
    ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, $.kCGNullWindowID)),
  ) || [];
  const near = (a, b) => Math.abs(a - b) <= 1;
  const match = list.find((info) => {
    const b = info.kCGWindowBounds;
    return info.kCGWindowOwnerName === "Raycast" && b && near(b.X, x) && near(b.Y, y) && near(b.Width, w) && near(b.Height, h);
  });
  return match ? String(match.kCGWindowNumber) : "";
}`;

/**
 * Draws the wallpaper to fill the canvas (cropping, never stretching), then the window centered
 * horizontally at canvas width minus padding, with paddingY above it. Sizes are in pixels.
 */
const COMPOSITE_SCRIPT = `
ObjC.import("AppKit");
function run(argv) {
  const [wallpaperPath, windowPath, outPath, type] = argv;
  const [W, H, PX, PY] = argv.slice(4).map(Number);
  const wallpaper = $.NSImage.alloc.initWithContentsOfFile(wallpaperPath);
  if (wallpaper.isNil()) throw new Error("not an image");
  const win = $.NSImage.alloc.initWithContentsOfFile(windowPath);
  if (win.isNil()) throw new Error("window capture unreadable");
  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, W, H, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  rep.size = $.NSMakeSize(W, H);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
  const ws = wallpaper.size;
  const scale = Math.max(W / ws.width, H / ws.height);
  const dw = ws.width * scale, dh = ws.height * scale;
  wallpaper.drawInRectFromRectOperationFraction($.NSMakeRect((W - dw) / 2, (H - dh) / 2, dw, dh), $.NSZeroRect, $.NSCompositingOperationCopy, 1);
  const s = win.size;
  const ww = W - 2 * PX, wh = (ww * s.height) / s.width;
  win.drawInRectFromRectOperationFraction($.NSMakeRect(PX, H - PY - wh, ww, wh), $.NSZeroRect, $.NSCompositingOperationSourceOver, 1);
  $.NSGraphicsContext.restoreGraphicsState;
  const types = { png: $.NSBitmapImageFileTypePNG, jpg: $.NSBitmapImageFileTypeJPEG, tiff: $.NSBitmapImageFileTypeTIFF };
  const data = rep.representationUsingTypeProperties(types[type], $());
  if (!data.writeToFileAtomically(outPath, true)) throw new Error("write failed");
  return "ok";
}`;

/** Composites an already captured window image onto the wallpaper and writes `outPath`. */
export async function compositeOnWallpaper(
  wallpaperPath: string,
  windowImagePath: string,
  outPath: string,
  format: "png" | "jpg" | "tiff",
  canvas: Canvas,
) {
  try {
    await runJXA(COMPOSITE_SCRIPT, [
      wallpaperPath,
      windowImagePath,
      outPath,
      format,
      canvas.width,
      canvas.height,
      canvas.paddingX,
      canvas.paddingY,
    ]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (detail.includes("not an image"))
      throw new Error(`Custom Wallpaper ${wallpaperPath} isn't an image macOS can read.`);
    throw error;
  }
}

/**
 * Captures only the Raycast window (no desktop, no shadow) and places it on the wallpaper, so every
 * screenshot has the same background whatever is open behind Raycast.
 */
export async function captureOnWallpaper(
  frame: Frame,
  wallpaperPath: string,
  outPath: string,
  format: "png" | "jpg" | "tiff",
  canvas: Canvas,
) {
  if (!existsSync(wallpaperPath)) throw new Error(`Custom Wallpaper ${wallpaperPath} doesn't exist.`);
  // Core Graphics can lag the window's first frame by a moment, so look a few times.
  let windowNumber = "";
  for (let attempt = 0; attempt < 3 && !windowNumber; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 150));
    windowNumber = await runJXA(WINDOW_NUMBER_SCRIPT, [frame.x, frame.y, frame.w, frame.h]);
  }
  if (!windowNumber) throw new Error("Couldn't find the Raycast window to capture.");

  const workDir = mkdtempSync(join(tmpdir(), "capture-raycast-metadata-"));
  try {
    const windowImage = join(workDir, "window.png");
    await execFileAsync("/usr/sbin/screencapture", ["-x", "-o", "-t", "png", "-l", windowNumber, windowImage]);
    if (!existsSync(windowImage)) throw new Error("screencapture didn't write the window image.");
    await compositeOnWallpaper(wallpaperPath, windowImage, outPath, format, canvas);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

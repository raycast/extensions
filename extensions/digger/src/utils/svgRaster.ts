import { execFile } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { LIMITS, TIMEOUTS } from "./config";

const run = promisify(execFile);

/** Copy as PNG exists only where this file can run. */
export const canCopySvgAsPng = process.platform === "darwin";

/**
 * Rasterizes an SVG with AppKit and puts the PNG on the pasteboard.
 *
 * JXA, not `qlmanage -t`. Quick Look makes THUMBNAILS: always square, always on
 * an opaque white background, so a 140×71 wordmark came back as a 1024×1024
 * white tile with the logo letterboxed inside it. NSImage reads SVG natively and
 * drawing it into a transparent bitmap keeps both the alpha and the aspect ratio
 * (140×71 → 1024×519). osascript ships with macOS, so this adds no dependency
 * and needs no Xcode.
 *
 * The pixels go on the pasteboard as DATA — PNG and TIFF, for apps that read
 * only one of them. A file URL on the clipboard is a pointer; deleting the
 * temp file behind it would leave nothing to paste.
 */
const SCRIPT = `
ObjC.import("AppKit");
function run(argv) {
  const img = $.NSImage.alloc.initWithContentsOfFile(argv[0]);
  if (!img || img.isNil()) throw new Error("macOS could not read this SVG");
  const w0 = img.size.width, h0 = img.size.height;
  if (!(w0 > 0 && h0 > 0)) throw new Error("This SVG has no size to render at");
  const scale = Number(argv[1]) / Math.max(w0, h0);
  const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, w, h, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  rep.size = $.NSMakeSize(w, h);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
  img.drawInRectFromRectOperationFraction($.NSMakeRect(0, 0, w, h), $.NSZeroRect, $.NSCompositingOperationSourceOver, 1.0);
  $.NSGraphicsContext.restoreGraphicsState;
  const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  pb.setDataForType(png, $.NSPasteboardTypePNG);
  pb.setDataForType(rep.TIFFRepresentation, $.NSPasteboardTypeTIFF);
  return w + "x" + h;
}
`;

/** Returns the pixel size that was copied. */
export async function copySvgAsPng(markup: string): Promise<{ width: number; height: number }> {
  if (!canCopySvgAsPng) throw new Error("Copy as PNG is available on macOS only");
  const dir = await mkdtemp(join(tmpdir(), "digger-svg-"));
  try {
    const file = join(dir, "image.svg");
    await writeFile(file, markup, "utf8");
    const { stdout } = await run(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", SCRIPT, file, String(LIMITS.SVG_PNG_SIZE)],
      { timeout: TIMEOUTS.SVG_RASTER },
    );
    const [width, height] = stdout.trim().split("x").map(Number);
    if (!(width > 0 && height > 0)) throw new Error(`Unexpected rasterizer output: ${stdout.trim()}`);
    return { width, height };
  } catch (error) {
    // osascript reports a thrown JXA error as "execution error: Error: <message> (-2700)".
    const message = error instanceof Error ? error.message : String(error);
    const inner = /(?:Error: )+(.+?) \(-?\d+\)/.exec(message)?.[1];
    throw new Error(inner ?? message);
  } finally {
    // Safe to delete: the pasteboard holds the pixels, not a path to this file.
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

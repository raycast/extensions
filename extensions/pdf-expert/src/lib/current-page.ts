import { execFileSync } from "child_process";
import { statSync } from "fs";
import { PdfFile } from "./pdf-expert";

const APP_NAME = "PDF Expert";
const LAST_POSITION_XATTR = "com.readdle.LastPosition";

export interface PageImageInfo {
  width: number;
  height: number;
  pageCount: number;
}

/**
 * Picks the document currently shown in PDF Expert among the open tabs.
 * The front window title equals the file name without extension; ties and
 * misses are resolved by the most recently changed file, because PDF Expert
 * rewrites the LastPosition xattr (bumping ctime) whenever the view moves.
 */
export function pickCurrentDocument(
  tabs: PdfFile[],
  windowTitle: string | null,
  changedAt: (path: string) => number = xattrChangedAt,
): PdfFile | null {
  if (tabs.length === 0) return null;
  const byTitle = windowTitle ? tabs.filter((t) => t.name === windowTitle) : [];
  const candidates = byTitle.length > 0 ? byTitle : tabs;
  return candidates.reduce((best, t) =>
    changedAt(t.path) > changedAt(best.path) ? t : best,
  );
}

function xattrChangedAt(path: string): number {
  try {
    return statSync(path).ctimeMs;
  } catch {
    return 0;
  }
}

export function getFrontWindowTitle(): string | null {
  // "window 1" can be a nameless dialog/popover: pick the main standard window instead.
  const script = `tell application "System Events" to tell process "${APP_NAME}"
  set docWindows to (windows whose subrole is "AXStandardWindow")
  repeat with w in docWindows
    if value of attribute "AXMain" of w is true then return name of w
  end repeat
  if (count of docWindows) > 0 then return name of item 1 of docWindows
  return ""
end tell`;
  try {
    const out = execFileSync("osascript", ["-e", script], {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** 1-based page number PDF Expert last stored for this file, or null if unknown. */
export function getCurrentPageNumber(filePath: string): number | null {
  let base64: string;
  try {
    const hex = execFileSync("xattr", ["-px", LAST_POSITION_XATTR, filePath], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    base64 = Buffer.from(hex.replace(/\s+/g, ""), "hex").toString("base64");
  } catch {
    return null;
  }

  const jxa = `
ObjC.import("Foundation")
function run(argv) {
  var data = $.NSData.alloc.initWithBase64EncodedStringOptions(argv[0], 0)
  if (data.isNil()) return "null"
  // Secure coding with an explicit allow-list: the xattr travels with the PDF, so treat it as untrusted.
  var classes = $.NSSet.setWithArray($([$.NSDictionary.class, $.NSString.class, $.NSNumber.class]))
  var error = Ref()
  var root = $.NSKeyedUnarchiver.unarchivedObjectOfClassesFromDataError(classes, data, error)
  if (root.isNil() || !root.isKindOfClass($.NSDictionary)) return "null"
  var page = root.objectForKey("pageNumber")
  return page.isNil() ? "null" : String(ObjC.unwrap(page))
}`;
  try {
    const out = execFileSync(
      "osascript",
      ["-l", "JavaScript", "-e", jxa, base64],
      {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    const page = Number(out);
    return Number.isInteger(page) && page > 0 ? page : null;
  } catch {
    return null;
  }
}

/**
 * Renders one page of the PDF with PDFKit at the given DPI and puts it on the
 * system clipboard as PNG + TIFF. Throws with a readable message on failure.
 */
export function copyPageImageToClipboard(
  filePath: string,
  pageNumber: number,
  dpi: number,
): PageImageInfo {
  const jxa = `
ObjC.import("Foundation")
ObjC.import("AppKit")
ObjC.import("Quartz")
function run(argv) {
  var path = argv[0], index = parseInt(argv[1], 10), dpi = parseFloat(argv[2])
  var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(path))
  if (doc.isNil()) return JSON.stringify({ error: "Cannot open PDF" })
  var count = Number(doc.pageCount)
  if (index < 0 || index >= count) return JSON.stringify({ error: "Page " + (index + 1) + " is out of range (" + count + " pages)" })
  var page = doc.pageAtIndex(index)
  var box = $.kPDFDisplayBoxCropBox
  var bounds = page.boundsForBox(box)
  var scale = dpi / 72
  var w = bounds.size.width, h = bounds.size.height
  if (page.rotation % 180 !== 0) { var t = w; w = h; h = t }
  var pw = Math.round(w * scale), ph = Math.round(h * scale)
  var rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, pw, ph, 8, 4, true, false, $.NSCalibratedRGBColorSpace, 0, 0)
  var ctx = $.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep)
  $.NSGraphicsContext.saveGraphicsState
  $.NSGraphicsContext.currentContext = ctx
  var cg = ctx.CGContext
  $.CGContextSetRGBFillColor(cg, 1, 1, 1, 1)
  $.CGContextFillRect(cg, $.CGRectMake(0, 0, pw, ph))
  $.CGContextScaleCTM(cg, scale, scale)
  page.drawWithBoxToContext(box, cg)
  $.NSGraphicsContext.restoreGraphicsState
  var png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $())
  var tiff = rep.TIFFRepresentation
  var pb = $.NSPasteboard.generalPasteboard
  pb.clearContents
  pb.setDataForType(png, "public.png")
  pb.setDataForType(tiff, "public.tiff")
  return JSON.stringify({ width: pw, height: ph, pageCount: count })
}`;
  const out = execFileSync(
    "osascript",
    [
      "-l",
      "JavaScript",
      "-e",
      jxa,
      filePath,
      String(pageNumber - 1),
      String(dpi),
    ],
    { encoding: "utf-8", timeout: 30000, stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
  const result = JSON.parse(out) as PageImageInfo | { error: string };
  if ("error" in result) throw new Error(result.error);
  return result;
}

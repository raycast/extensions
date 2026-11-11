import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { saveClipboardImage } from "./clipboard";
import { imageSize } from "./images";

// A private pasteboard, so the tests never read or change the user's clipboard.
const pasteboard = `dev-null-test-${process.pid}`;
const dir = mkdtempSync(join(tmpdir(), "devnull-clipboard-"));

function onPasteboard(script: string, ...args: string[]) {
  execFileSync("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    `ObjC.import("AppKit"); ${script}`,
    pasteboard,
    ...args,
  ]);
}

/** Puts an image on the private pasteboard as TIFF, the way most apps copy one. */
function copyImage(width: number, height: number) {
  const source = join(dir, "source.tiff");
  execFileSync("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    `ObjC.import("AppKit");
    function run(argv) {
      const bitmap = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
        null, Number(argv[1]), Number(argv[2]), 8, 3, false, false, $.NSDeviceRGBColorSpace, 0, 0);
      bitmap.TIFFRepresentation.writeToFileAtomically(argv[0], true);
    }`,
    source,
    String(width),
    String(height),
  ]);
  onPasteboard(
    `function run(argv) {
      const board = $.NSPasteboard.pasteboardWithName(argv[0]);
      board.clearContents;
      board.setDataForType($.NSData.dataWithContentsOfFile(argv[1]), $.NSPasteboardTypeTIFF);
    }`,
    source,
  );
}

afterAll(() => {
  onPasteboard(`function run(argv) { $.NSPasteboard.pasteboardWithName(argv[0]).releaseGlobally; }`);
  rmSync(dir, { recursive: true, force: true });
});

describe("saveClipboardImage", () => {
  it("saves a copied image as a PNG of the same size", async () => {
    copyImage(7, 5);
    const path = await saveClipboardImage(join(dir, "pasted"), [], pasteboard);
    expect(path).toMatch(/pasted-\d+\.png$/);
    expect(imageSize(readFileSync(path!))).toEqual({ width: 7, height: 5 });
  });

  it("answers undefined when the clipboard holds no image", async () => {
    onPasteboard(`function run(argv) {
      const board = $.NSPasteboard.pasteboardWithName(argv[0]);
      board.clearContents;
      board.setStringForType($("just text"), $.NSPasteboardTypeString);
    }`);
    await expect(saveClipboardImage(join(dir, "pasted"), [], pasteboard)).resolves.toBeUndefined();
  });

  it("removes pasted images older than a week, except the ones still attached", async () => {
    const pasted = join(dir, "old");
    copyImage(2, 2);
    const kept = (await saveClipboardImage(pasted, [], pasteboard))!;
    const stale = join(pasted, "pasted-1.png");
    writeFileSync(stale, "old");
    const weekAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    utimesSync(stale, weekAgo, weekAgo);
    utimesSync(kept, weekAgo, weekAgo);

    await saveClipboardImage(pasted, [kept], pasteboard);
    expect(() => readFileSync(stale)).toThrow();
    expect(readFileSync(kept).length).toBeGreaterThan(0);
  });
});

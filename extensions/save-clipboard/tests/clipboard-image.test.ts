import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readClipboardImage, saveClipboardImageAsJpeg } from "../src/clipboard-image.ts";

const onMac = { skip: process.platform !== "darwin" };

// Use isolated pasteboards so these tests never replace the user's clipboard.
function createPasteboard(file?: string, type = "public.png"): string {
  return execFileSync(
    "/usr/bin/osascript",
    [
      "-l",
      "JavaScript",
      "-e",
      `ObjC.import("AppKit");
       function run(argv) {
         const board = $.NSPasteboard.pasteboardWithUniqueName;
         if (argv[0]) {
           board.setDataForType($.NSData.dataWithContentsOfFile(argv[0]), argv[1]);
         } else {
           board.setStringForType("some text", "public.utf8-plain-text");
         }
         return ObjC.unwrap(board.name);
       }`,
      file || "",
      type,
    ],
    { encoding: "utf8" },
  ).trim();
}

function releasePasteboard(name: string) {
  execFileSync("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    'ObjC.import("AppKit"); function run(argv) { $.NSPasteboard.pasteboardWithName(argv[0]).releaseGlobally; }',
    name,
  ]);
}

for (const type of ["png", "tiff"]) {
  test(`reads native ${type} without a file URL and saves JPEG`, onMac, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "save-clipboard-test-"));
    const fixture = path.join(directory, `clipboard.${type}`);
    const output = path.join(directory, "saved image.jpg");
    execFileSync("/usr/bin/sips", ["-s", "format", type, path.resolve("assets/extension-icon.png"), "--out", fixture]);
    const name = createPasteboard(fixture, `public.${type}`);
    try {
      const image = await readClipboardImage(name);
      assert.deepEqual(image, fs.readFileSync(fixture));
      saveClipboardImageAsJpeg(image!, output);
      assert.deepEqual(fs.readFileSync(output).subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]));
      // Saving and reading leave the clipboard contents unchanged.
      assert.deepEqual(await readClipboardImage(name), image);
      const temporaryImages = () =>
        fs.readdirSync(os.tmpdir()).filter((entry) => entry.startsWith("raycast-save-clipboard-"));
      const beforeFailure = temporaryImages();
      assert.throws(() => saveClipboardImageAsJpeg(Buffer.from("invalid image"), output));
      assert.deepEqual(temporaryImages(), beforeFailure);
    } finally {
      releasePasteboard(name);
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("text-only clipboard has no native image", onMac, async () => {
  const name = createPasteboard();
  try {
    assert.equal(await readClipboardImage(name), undefined);
  } finally {
    releasePasteboard(name);
  }
});

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CLIPBOARD_IMAGE_PREFIX,
  hasClipboardImage,
  removeOldClipboardImages,
  saveClipboardImage,
} from "../src/lib/clipboard-image";

const execFileAsync = promisify(execFile);

// Puts a PNG file on a private, named pasteboard, so the test never touches the real clipboard.
async function putImageOnPasteboard(name: string, pngPath: string) {
  const script = `
  function run(argv) {
    ObjC.import("AppKit");
    const board = $.NSPasteboard.pasteboardWithName(argv[0]);
    board.clearContents;
    const data = $.NSData.dataWithContentsOfFile(argv[1]);
    return board.setDataForType(data, "public.png");
  }`;
  await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script, name, pngPath]);
}

async function releasePasteboard(name: string) {
  const script = `function run(argv) { ObjC.import("AppKit"); $.NSPasteboard.pasteboardWithName(argv[0]).releaseGlobally; }`;
  await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script, name]);
}

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "afm-clipboard-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe.skipIf(process.platform !== "darwin")("saveClipboardImage", () => {
  it("saves PNG data from the pasteboard to a file", async () => {
    const name = `afm-test-${randomUUID()}`;
    const icon = resolve(__dirname, "../assets/extension-icon.png");
    try {
      await putImageOnPasteboard(name, icon);
      const saved = await saveClipboardImage(directory, name);
      expect(saved).toMatch(new RegExp(`${CLIPBOARD_IMAGE_PREFIX}.*\\.png$`));
      expect(await readFile(saved!)).toEqual(await readFile(icon));
    } finally {
      await releasePasteboard(name);
    }
  });

  it("finds image data without saving it", async () => {
    const name = `afm-test-${randomUUID()}`;
    try {
      expect(await hasClipboardImage(name)).toBe(false);
      await putImageOnPasteboard(name, resolve(__dirname, "../assets/extension-icon.png"));
      expect(await hasClipboardImage(name)).toBe(true);
      expect(await readdir(directory)).toEqual([]);
    } finally {
      await releasePasteboard(name);
    }
  });

  it("returns nothing for a pasteboard without an image", async () => {
    const name = `afm-test-${randomUUID()}`;
    try {
      expect(await saveClipboardImage(directory, name)).toBeUndefined();
    } finally {
      await releasePasteboard(name);
    }
  });
});

describe("removeOldClipboardImages", () => {
  it("removes only old clipboard images", async () => {
    const old = join(directory, `${CLIPBOARD_IMAGE_PREFIX}old.png`);
    const recent = join(directory, `${CLIPBOARD_IMAGE_PREFIX}recent.png`);
    const other = join(directory, "chat-transcript.json");
    for (const path of [old, recent, other]) await writeFile(path, "x");
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(old, twoHoursAgo, twoHoursAgo);
    await utimes(other, twoHoursAgo, twoHoursAgo);

    await removeOldClipboardImages(directory);
    expect((await readdir(directory)).sort()).toEqual(["chat-transcript.json", `${CLIPBOARD_IMAGE_PREFIX}recent.png`]);
  });

  it("does nothing when the folder does not exist", async () => {
    await expect(removeOldClipboardImages(join(directory, "missing"))).resolves.toBeUndefined();
  });
});

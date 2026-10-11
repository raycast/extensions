import assert from "node:assert/strict";
import { test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  codeBlock,
  decodeTextSample,
  describeKind,
  displayPath,
  fitPreviewSize,
  formatDuration,
  formatSize,
  imageDimensions,
  isProtectedPath,
  languageFor,
  normalizeQuery,
} from "../src/format.ts";
import {
  downloadHost,
  finderTags,
  folderDetails,
  formatClock,
  parseSpotlight,
  parseTagAttribute,
} from "../src/preview.ts";

test("formats sizes and durations for humans", () => {
  assert.equal(formatSize(0), "0 B");
  assert.equal(formatSize(512), "512 B");
  assert.equal(formatSize(5480), "5 KB");
  assert.equal(formatSize(162911969), "155.4 MB");
  assert.equal(formatSize(3 * 1024 ** 3), "3.0 GB");
  assert.equal(formatSize(-1), "");
  assert.equal(formatDuration(532), "<1 ms");
  assert.equal(formatDuration(31030), "31 ms");
  assert.equal(formatDuration(2_500_000), "2.5 s");
});

test("shortens home paths and recognises protected folders", () => {
  const home = homedir();
  assert.equal(displayPath(home), "~");
  assert.equal(displayPath(`${home}/Downloads/x.pdf`), "~/Downloads/x.pdf");
  assert.equal(displayPath("/Applications"), "/Applications");
  assert.equal(displayPath(`${home}sibling/file`), `${home}sibling/file`);
  assert.equal(isProtectedPath(`${home}/Downloads`), true);
  assert.equal(isProtectedPath(`${home}/Documents/Taxes`), true);
  assert.equal(isProtectedPath(`${home}/DownloadsArchive`), false);
  assert.equal(isProtectedPath(`${home}/Developer`), false);
  assert.equal(isProtectedPath("/Applications"), false);
});

test("describes result kinds", () => {
  assert.equal(describeKind("/Applications/Safari.app", "dir"), "Application");
  assert.equal(describeKind("/Users/me/Documents", "dir"), "Folder");
  assert.equal(describeKind("/Applications/X.app", "link"), "Symbolic Link");
  assert.equal(describeKind("/tmp/report.PDF", "file"), "PDF File");
  assert.equal(describeKind("/tmp/README", "file"), "File");
  assert.equal(describeKind("/tmp/weird.averyveryverylongext", "file"), "File");
});

test("code blocks survive backticks in content", () => {
  assert.equal(codeBlock("hello\n", "ts"), "```ts\nhello\n```");
  const tricky = "a ``` b\n```` c";
  const block = codeBlock(tricky, "markdown");
  assert.ok(block.startsWith("`````markdown\n"));
  assert.ok(block.endsWith("\n`````"));
  assert.equal(codeBlock("x", "bad lang!"), "```\nx\n```");
});

test("decodes UTF-8 samples cut mid-character and rejects binary", () => {
  const encoder = new TextEncoder();
  const text = "Система склонения — файл".repeat(3);
  const bytes = encoder.encode(text);
  // Cut inside the last multi-byte character.
  const cut = bytes.subarray(0, bytes.length - 1);
  assert.equal(decodeTextSample(cut, false), undefined);
  const decoded = decodeTextSample(cut, true);
  assert.ok(decoded !== undefined);
  assert.ok(text.startsWith(decoded));
  assert.equal(
    decodeTextSample(encoder.encode("\uFEFFa\r\nb\rc"), false),
    "a\nb\nc",
  );
  assert.equal(
    decodeTextSample(new Uint8Array([0x68, 0x00, 0x69]), false),
    undefined,
  );
  assert.equal(
    decodeTextSample(new Uint8Array([0x68, 0x1b, 0x69]), false),
    undefined,
  );
  assert.equal(
    decodeTextSample(new Uint8Array([0xff, 0xfe, 0x41]), false),
    undefined,
  );
  assert.equal(
    decodeTextSample(encoder.encode("tab\there\fpage"), false),
    "tab\there\fpage",
  );
});

test("maps extensions to fence languages", () => {
  assert.equal(languageFor("/a/b.tsx"), "tsx");
  assert.equal(languageFor("/a/b.MJS"), "javascript");
  assert.equal(languageFor("/a/Info.plist"), "xml");
  assert.equal(languageFor("/a/README"), "");
  assert.equal(languageFor("/a/photo.heic"), "");
});

test("reads image dimensions from headers", async () => {
  const png = await readFile(new URL("../assets/icon.png", import.meta.url));
  assert.deepEqual(imageDimensions(png), { width: 512, height: 512 });
  const placeholder = await readFile(
    new URL("../assets/preview-placeholder.png", import.meta.url),
  );
  assert.deepEqual(imageDimensions(placeholder), { width: 1, height: 220 });
  // GIF89a header with a 300x200 logical screen.
  const gif = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x2c, 0x01, 0xc8, 0x00, 0, 0, 0,
  ]);
  assert.deepEqual(imageDimensions(gif), { width: 300, height: 200 });
  // Minimal JPEG: SOI, an APP0 segment, then SOF0 declaring 640x480.
  const jpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xc0, 0x00, 0x11,
    0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff,
    0xd9,
  ]);
  assert.deepEqual(imageDimensions(jpeg), { width: 640, height: 480 });
  // WebP VP8X extended header for a 1024x768 image (sizes stored minus one).
  const webp = new Uint8Array(40);
  webp.set([0x52, 0x49, 0x46, 0x46], 0);
  webp.set([0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58], 8);
  webp.set([0xff, 0x03, 0x00, 0xff, 0x02, 0x00], 24);
  assert.deepEqual(imageDimensions(webp), { width: 1024, height: 768 });
  assert.equal(imageDimensions(new Uint8Array([1, 2, 3])), undefined);
  assert.equal(
    imageDimensions(new TextEncoder().encode("plain text file content")),
    undefined,
  );

  assert.deepEqual(fitPreviewSize({ width: 4000, height: 1000 }, 320, 240), {
    width: 320,
    height: 80,
  });
  assert.deepEqual(fitPreviewSize({ width: 1000, height: 4000 }, 320, 240), {
    width: 60,
    height: 240,
  });
  assert.deepEqual(fitPreviewSize({ width: 332, height: 687 }, 280, 150), {
    width: 72,
    height: 150,
  });
  assert.deepEqual(fitPreviewSize({ width: 100, height: 50 }, 320, 240), {
    width: 100,
    height: 50,
  });
  assert.deepEqual(fitPreviewSize(undefined), { width: 280, height: 150 });
});

test("normalizeQuery turns wildcards into fsearch filters", () => {
  assert.equal(normalizeQuery("*.docx"), "ext:docx");
  assert.equal(normalizeQuery("*.PDF"), "ext:pdf");
  assert.equal(normalizeQuery("report*.pdf"), "report ext:pdf");
  assert.equal(normalizeQuery("*mario*"), "mario");
  assert.equal(normalizeQuery("ext:pdf in:~/Docs*"), "ext:pdf in:~/Docs*");
  assert.equal(normalizeQuery("  plain   words "), "plain words");
  assert.equal(normalizeQuery("*"), "");
});

test("formatClock renders durations", () => {
  assert.equal(formatClock(29.44), "0:29");
  assert.equal(formatClock(3725), "1:02:05");
});

test("folderDetails counts visible items like Finder", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fsearch-folder-"));
  try {
    assert.equal(await folderDetails(dir), "Empty");
    await writeFile(join(dir, "a.txt"), "a");
    await writeFile(join(dir, ".DS_Store"), "");
    assert.equal(await folderDetails(dir), "1 item");
    await writeFile(join(dir, "b.txt"), "b");
    assert.equal(await folderDetails(dir), "2 items");
    assert.equal(await folderDetails(join(dir, "missing")), undefined);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("parses Spotlight output including arrays and picks download hosts", () => {
  const values = parseSpotlight(
    [
      'kMDItemVersion      = "1.23.2"',
      "kMDItemNumberOfPages = (null)",
      "kMDItemWhereFroms   = (",
      '    "https://www.github.com/x/y/releases/a.zip",',
      '    "https://github.com/x/y"',
      ")",
      "kMDItemUserTags     = (",
      "    Red,",
      '    "Important stuff"',
      ")",
    ].join("\n"),
  );
  assert.deepEqual(values.get("kMDItemVersion"), ["1.23.2"]);
  assert.equal(values.has("kMDItemNumberOfPages"), false);
  assert.deepEqual(values.get("kMDItemUserTags"), ["Red", "Important stuff"]);
  assert.equal(downloadHost(values.get("kMDItemWhereFroms")[0]), "github.com");
  assert.equal(downloadHost("not a url"), undefined);
  assert.equal(downloadHost(undefined), undefined);
});

test("colors Finder tags by built-in name, then stored index", () => {
  const stored = parseTagAttribute(
    '["Green\\n1","Work\\n6","Later\\n1","Odd"]',
  );
  assert.deepEqual(finderTags(["Green", "Work", "Later", "Custom"], stored), [
    { name: "Green", color: "green" },
    { name: "Work", color: "red" },
    { name: "Later", color: "gray" },
    { name: "Custom", color: "gray" },
  ]);
  assert.equal(parseTagAttribute("nonsense").size, 0);
});

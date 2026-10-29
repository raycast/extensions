import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { buildMarkdownWithMedia } from "./markdown";

// A directory with a space, mirroring the real cache under "Application Support".
let dir: string;
let photo: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "tg test "));
  photo = path.join(dir, "media 1.jpg");
  fs.writeFileSync(photo, "not really a jpeg");
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("buildMarkdownWithMedia", () => {
  it("references the photo on disk rather than inlining it", () => {
    const markdown = buildMarkdownWithMedia({ media: { filePath: photo, type: "photo" } });

    // Raycast's renderer drops large base64 data URIs, leaving the pane blank.
    expect(markdown).not.toContain("base64");
    expect(markdown).toContain("file://");
  });

  it("percent-encodes the path so it survives as a URL", () => {
    const markdown = buildMarkdownWithMedia({ media: { filePath: photo, type: "photo" } });

    // A raw space would terminate the Markdown image URL early.
    expect(markdown).toContain("%20");
    expect(markdown).not.toMatch(/file:\/\/[^)]* /);

    // Round-trip rather than asserting a hand-built URL: the encoding differs
    // between platforms, and the extension ships on macOS and Windows.
    const url = markdown.slice("![](".length, -")".length);
    expect(fileURLToPath(url)).toBe(photo);
  });

  it("omits the image when the cached file is gone", () => {
    const markdown = buildMarkdownWithMedia({
      text: "caption",
      media: { filePath: path.join(dir, "missing.jpg"), type: "photo" },
    });

    expect(markdown).toBe("caption");
  });

  it("only embeds image media, not documents or video", () => {
    const markdown = buildMarkdownWithMedia({ text: "report.pdf", media: { filePath: photo, type: "document" } });

    expect(markdown).not.toContain("file://");
    expect(markdown).toBe("report.pdf");
  });

  it("puts the sender prefix above the text", () => {
    const markdown = buildMarkdownWithMedia({ prefix: "**Ada**\n\n", text: "hello" });

    expect(markdown.startsWith("**Ada**")).toBe(true);
    expect(markdown.trimEnd().endsWith("hello")).toBe(true);
  });
});

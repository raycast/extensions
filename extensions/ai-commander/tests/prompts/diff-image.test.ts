import { describe, expect, it } from "vitest";
import { diffSegments, type DiffSegment } from "../../src/prompts/diff";
import { MAX_DIFF_IMAGE_CHARS, renderDiffImage, renderDiffSvg } from "../../src/prompts/diff-image";

const dark = { appearance: "dark" } as const;

describe("renderDiffSvg", () => {
  it("highlights added words and keeps equal text plain", () => {
    const svg = renderDiffSvg(diffSegments("one two three", "one 2 three") ?? [], dark);
    expect(svg).toMatch(/<span style="background:[^"]+">2<\/span>/);
    expect(svg).toContain("one ");
    expect(svg).not.toContain("two");
  });

  it("marks removals without repeating the removed text", () => {
    const segments: DiffSegment[] = [
      { type: "equal", text: "kept " },
      { type: "change", removed: "gone", added: "" },
    ];
    const svg = renderDiffSvg(segments, dark);
    expect(svg).not.toContain("gone");
    expect(svg).toContain("width:2px");
  });

  it("keeps whitespace outside of highlights", () => {
    const svg = renderDiffSvg([{ type: "change", removed: "", added: " new " }], dark);
    expect(svg).toMatch(/> <span[^>]*>new<\/span> </);
  });

  it("escapes markup, so text cannot break out of the image", () => {
    const svg = renderDiffSvg([{ type: "equal", text: `</div><script>alert("x")</script> & \u0007` }], dark);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("&amp;");
    expect(svg).not.toContain("\u0007");
  });

  it("replaces lone surrogates, which would otherwise crash the view while encoding", () => {
    const image = renderDiffImage([{ type: "equal", text: "broken \ud83d emoji" }], dark);
    expect(image).toBeDefined();
    expect(decodeURIComponent(image ?? "")).toContain("broken \ufffd emoji");
  });

  it("reserves more height for wide glyphs, capitals, and tabs", () => {
    const height = (text: string) => Number(/height="(\d+)"/.exec(renderDiffSvg([{ type: "equal", text }], dark))?.[1]);
    expect(height("语".repeat(200))).toBeGreaterThan(height("a".repeat(200)));
    expect(height("A".repeat(200))).toBeGreaterThan(height("a".repeat(200)));
    expect(height("\t".repeat(50))).toBeGreaterThan(height("a".repeat(50)));
    expect(height("😀".repeat(100))).toBeGreaterThan(height("a".repeat(100)));
  });

  it("uses a different palette per appearance", () => {
    const segments: DiffSegment[] = [{ type: "equal", text: "text" }];
    expect(renderDiffSvg(segments, dark)).not.toBe(renderDiffSvg(segments, { appearance: "light" }));
  });

  it("grows with the text", () => {
    const height = (text: string) => Number(/height="(\d+)"/.exec(renderDiffSvg([{ type: "equal", text }], dark))?.[1]);
    expect(height("word ".repeat(400))).toBeGreaterThan(height("word"));
    expect(height("a\nb\nc")).toBeGreaterThan(height("a"));
  });
});

describe("renderDiffImage", () => {
  it("builds a Markdown image with a URL that nothing in Markdown can end early", () => {
    const image = renderDiffImage([{ type: "equal", text: "a (b) 'c'" }], dark) ?? "";
    expect(image.startsWith("![Changes](data:image/svg+xml,")).toBe(true);
    expect(image.slice("![Changes](".length, -1)).not.toMatch(/[()\s'"]/);
    expect(image.endsWith(")")).toBe(true);
  });

  it("gives up on very long text", () => {
    expect(renderDiffImage([{ type: "equal", text: "x".repeat(MAX_DIFF_IMAGE_CHARS + 1) }], dark)).toBeUndefined();
  });
});

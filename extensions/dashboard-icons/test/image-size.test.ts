import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { previewMarkdown } from "../src/components/preview";
import { fitInto, imageSize } from "../src/lib/image-size";

// Real files from the Dashboard Icons CDN; reference sizes checked with `sips`.
const image = (name: string) => new Uint8Array(readFileSync(join(__dirname, "images", name)));

describe("imageSize", () => {
  it.each([
    ["ntfy.webp", 512, 512],
    ["portabase-wordmark-dark.webp", 1796, 512],
    ["portabase-light.png", 561, 512],
    ["ntfy.svg", 512, 512],
    ["portabase-wordmark-dark.svg", 656, 187],
  ])("reads %s", (name, width, height) => {
    expect(imageSize(image(name))).toEqual({ width, height });
  });

  it("reads SVG width and height without viewBox", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="64px" height="32">');
    expect(imageSize(svg)).toEqual({ width: 64, height: 32 });
  });

  it("returns undefined for unknown data", () => {
    expect(imageSize(new TextEncoder().encode("not an image"))).toBeUndefined();
    expect(imageSize(new Uint8Array())).toBeUndefined();
  });
});

describe("fitInto", () => {
  const box = { width: 240, height: 140 };

  it("fits square icons to the box height", () => {
    expect(fitInto({ width: 512, height: 512 }, box)).toEqual({ width: 140, height: 140 });
  });

  it("fits wide wordmarks to the box width", () => {
    expect(fitInto({ width: 1796, height: 512 }, box)).toEqual({ width: 240, height: 68 });
  });

  it("scales small images up and falls back to a square", () => {
    expect(fitInto({ width: 16, height: 16 }, box)).toEqual({ width: 140, height: 140 });
    expect(fitInto(undefined, box)).toEqual({ width: 140, height: 140 });
  });
});

describe("previewMarkdown", () => {
  const file = { variant: "default", format: "svg" as const, fileName: "x.svg", url: "https://cdn.example.com/x.svg" };

  it("adds width and height that keep the aspect ratio", () => {
    expect(previewMarkdown(file, "x [Base]", { width: 1796, height: 512 })).toBe(
      "![x Base](https://cdn.example.com/x.svg?raycast-width=240&raycast-height=68)",
    );
  });

  it("appends to an existing query string", () => {
    expect(previewMarkdown({ ...file, url: "https://cdn.example.com/x?c=1" }, "x", undefined)).toBe(
      "![x](https://cdn.example.com/x?c=1&raycast-width=140&raycast-height=140)",
    );
  });
});

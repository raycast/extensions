import { describe, expect, it } from "vitest";
import { BACKDROPS, svgToDataUri, withBackdrop } from "./svg";
import { cursors } from "../data/cursors";

describe("svgToDataUri", () => {
  it("URL-encodes '#' so hex colors don't truncate the SVG", () => {
    const uri = svgToDataUri('<svg fill="#189569"></svg>');
    expect(uri).not.toContain("#189569");
    expect(uri).toContain("%23189569");
  });

  it("produces a decodable data URI that round-trips the original SVG", () => {
    const svg = '<svg><path fill="#44C67A" d="M1 1"/></svg>';
    const uri = svgToDataUri(svg);
    const decoded = decodeURIComponent(uri.replace("data:image/svg+xml,", ""));
    expect(decoded).toBe(svg);
  });

  it("never leaves a raw '#' in the encoded payload for any bundled cursor", () => {
    for (const cursor of cursors) {
      const payload = svgToDataUri(cursor.svg).replace("data:image/svg+xml,", "");
      expect(payload).not.toContain("#");
    }
  });
});

describe("withBackdrop", () => {
  const svg = '<svg width="32" height="32" viewBox="0 0 32 32"><path d="M1 1"/></svg>';

  it("returns the SVG unchanged for 'none'", () => {
    expect(withBackdrop(svg, "none")).toBe(svg);
  });

  it("fills the whole viewBox with a color rect behind the artwork", () => {
    const result = withBackdrop(svg, "gray");
    expect(result).toContain(`<rect x="0" y="0" width="32" height="32" fill="${BACKDROPS.gray.color}"/>`);
    // The rect must sit before the artwork so it renders behind it.
    expect(result.indexOf("<rect")).toBeLessThan(result.indexOf("<path"));
  });

  it("scales the artwork down inside the fill so it doesn't run edge-to-edge", () => {
    const result = withBackdrop(svg, "white");
    expect(result).toMatch(/<g transform="translate\(16,16\) scale\([\d.]+\) translate\(-16,-16\)">/);
    // The original artwork survives inside the group.
    expect(result).toContain('<path d="M1 1"/>');
  });

  it("uses the configured color for each non-none backdrop", () => {
    for (const key of ["white", "black", "gray"] as const) {
      expect(withBackdrop(svg, key)).toContain(`fill="${BACKDROPS[key].color}"`);
    }
  });

  it("keeps the SVG parseable — exactly one extra rect and one wrapper group", () => {
    const result = withBackdrop(svg, "white");
    expect((result.match(/<rect/g) ?? []).length).toBe(1);
    expect((result.match(/<g /g) ?? []).length).toBe(1);
    expect(result.endsWith("</svg>")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { BACKDROPS, importFor, jsxFor, stripRootDimensions, svgToDataUri, withBackdrop, withColor } from "./svg";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
  '<path d="M3.75 8.75L12 2Z" stroke="currentColor" stroke-width="1.5"/>' +
  "</svg>";

describe("withBackdrop", () => {
  it("returns the SVG untouched for `none`", () => {
    expect(withBackdrop(SVG, "none")).toBe(SVG);
  });

  it("uses the configured color for each non-none backdrop", () => {
    for (const key of Object.keys(BACKDROPS) as (keyof typeof BACKDROPS)[]) {
      const color = BACKDROPS[key].color;
      if (!color) continue;
      expect(withBackdrop(SVG, key)).toContain(`fill="${color}"`);
    }
  });

  it("paints a rect covering the whole expanded canvas", () => {
    // The grid drops its inset for backdropped tiles, so the canvas maps to the
    // whole tile and the rect fills it edge to edge.
    const result = withBackdrop(SVG, "white");
    expect(result).toContain('<rect x="0" y="0" width="63.36" height="63.36"');
    expect(result).toContain('viewBox="0 0 63.36 63.36"');
  });

  it("keeps the glyph at the same fraction of the tile as inset mode", () => {
    // Grid.Inset.Large renders a glyph at ~37.8% of the tile (56px of 148px).
    // With inset off the canvas IS the tile, so 24 / canvas must match that or
    // backdropped icons look a different size from plain ones.
    const canvas = Number(/viewBox="0 0 ([\d.]+)/.exec(withBackdrop(SVG, "black"))![1]);
    expect(24 / canvas).toBeCloseTo(0.378, 2);
  });

  it("centers the glyph at native size without scaling it", () => {
    // Scaling the glyph is what made backdropped icons a different size from
    // plain ones. The canvas grows instead; the grid's inset does the scaling.
    const result = withBackdrop(SVG, "black");
    expect(result).toContain('<g transform="translate(19.68,19.68)">');
    expect(result).not.toMatch(/scale\(/);
  });

  it("resolves currentColor to ink that contrasts with the backdrop", () => {
    // Raycast's tintColor can't be used with a backdrop — it would recolor the
    // rect too — so the ink is baked in. Left unresolved, a black backdrop
    // renders black-on-black.
    expect(withBackdrop(SVG, "black")).toContain('stroke="#FFFFFF"');
    expect(withBackdrop(SVG, "gray")).toContain('stroke="#FFFFFF"');
    expect(withBackdrop(SVG, "white")).toContain('stroke="#000000"');
    expect(withBackdrop(SVG, "black")).not.toContain("currentColor");
  });

  it("leaves currentColor alone with no backdrop, so tintColor can theme it", () => {
    expect(withBackdrop(SVG, "none")).toContain("currentColor");
  });

  it("keeps the original artwork inside the transform group", () => {
    const result = withBackdrop(SVG, "gray");
    expect(result).toContain('<path d="M3.75 8.75L12 2Z"');
    // The rect must precede the artwork, or it paints over the icon.
    expect(result.indexOf("<rect")).toBeLessThan(result.indexOf("<path"));
  });

  it("leaves markup unchanged when there is no root svg tag", () => {
    expect(withBackdrop("not svg", "white")).toBe("not svg");
  });
});

describe("svgToDataUri", () => {
  it("encodes '#' so a hex color cannot truncate the markup", () => {
    // The production bug: a raw '#' starts a URL fragment and everything after
    // it is discarded, rendering the tile blank.
    const withHex = withBackdrop(SVG, "white");
    const uri = svgToDataUri(withHex);
    expect(uri).not.toContain("#");
    expect(uri).toContain("%23FFFFFF");
  });

  it("encodes angle brackets and quotes", () => {
    const uri = svgToDataUri(SVG);
    expect(uri).not.toContain("<");
    expect(uri).not.toContain(">");
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
  });

  it("round-trips through decodeURIComponent", () => {
    expect(decodeURIComponent(svgToDataUri(SVG).replace("data:image/svg+xml,", ""))).toBe(SVG);
  });
});

describe("stripRootDimensions", () => {
  it("removes width and height from the root tag", () => {
    const stripped = stripRootDimensions(SVG);
    expect(stripped).not.toMatch(/<svg[^>]*width=/);
    expect(stripped).not.toMatch(/<svg[^>]*height=/);
  });

  it("preserves the viewBox, which is what resvg renders from", () => {
    expect(stripRootDimensions(SVG)).toContain('viewBox="0 0 24 24"');
  });

  it("leaves sized child elements alone", () => {
    const nested = '<svg width="24" height="24"><rect width="24" height="24"/></svg>';
    expect(stripRootDimensions(nested)).toBe('<svg><rect width="24" height="24"/></svg>');
  });
});

describe("withColor", () => {
  it("replaces every currentColor occurrence", () => {
    const multi = '<path stroke="currentColor"/><path fill="currentColor"/>';
    expect(withColor(multi, "#FF0000")).toBe('<path stroke="#FF0000"/><path fill="#FF0000"/>');
  });

  it("leaves markup without currentColor unchanged", () => {
    expect(withColor('<path fill="#000"/>', "#FFF")).toBe('<path fill="#000"/>');
  });
});

describe("code payloads", () => {
  it("builds a JSX tag", () => {
    expect(jsxFor("IconHome")).toBe("<IconHome />");
  });

  it("embeds the style in the import path", () => {
    // The import path is style-specific, so this must track the active style
    // rather than being a fixed string.
    expect(importFor("IconHome", "round-filled-radius-2-stroke-1.5")).toBe(
      "import { IconHome } from '@central-icons-react/round-filled-radius-2-stroke-1.5/IconHome';",
    );
  });
});

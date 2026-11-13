import { describe, expect, it } from "vitest";
import { escapeXml, svgDocument, svgToMarkdown, SVG_SCALE } from "./svg";

describe("svg helpers", () => {
  it("escapes xml special characters", () => {
    expect(escapeXml(`A&B <"x"> 'y'`)).toBe("A&amp;B &lt;&quot;x&quot;&gt; &apos;y&apos;");
  });

  it("wraps content with scaled size and logical viewBox", () => {
    const svg = svgDocument("<g/>", 460, 220);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`width="${460 * SVG_SCALE}"`);
    expect(svg).toContain(`height="${220 * SVG_SCALE}"`);
    expect(svg).toContain('viewBox="0 0 460 220"');
  });

  it("builds a markdown image data uri", () => {
    expect(svgToMarkdown("<svg/>", 460, 220, "Map")).toMatch(
      /^!\[Map\]\(data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+\?raycast-width=460&raycast-height=220\)$/,
    );
  });
});

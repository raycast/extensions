import { describe, expect, it } from "vitest";

import { createStrokeOrderDiagram } from "./svg";

const strokes = ["M 100 100 L 900 100", "M 500 50 L 500 850"];

function decodeSvg(dataUri: string): string {
  const encodedSvg = dataUri.replace("data:image/svg+xml;base64,", "");
  return Buffer.from(encodedSvg, "base64").toString();
}

describe("createStrokeOrderDiagram", () => {
  it("creates one progressive tile per stroke", () => {
    const svg = decodeSvg(createStrokeOrderDiagram("十", strokes).dataUri);

    expect(svg.match(/data-step=/g)).toHaveLength(2);
    expect(svg.match(/<path /g)).toHaveLength(4);
    expect(svg).not.toContain("<use");
    expect(svg).not.toContain("<defs");
    expect(svg.match(/fill="#E5484D"/g)).toHaveLength(4);
  });

  it("escapes SVG attribute data", () => {
    const svg = decodeSvg(createStrokeOrderDiagram("&", ['M 0 0 L 1 1" onload="alert(1)']).dataUri);

    expect(svg).toContain("Stroke order for &amp;");
    expect(svg).toContain("&quot; onload=&quot;");
    expect(svg).not.toContain('onload="alert');
  });

  it("rejects implausibly large stroke arrays", () => {
    const tooManyStrokes = Array.from({ length: 129 }, () => "M 0 0 L 1 1");
    expect(() => createStrokeOrderDiagram("龍", tooManyStrokes)).toThrow("128-stroke safety limit");
  });

  it("rejects diagrams whose inlined paths would be too large", () => {
    const largePath = `M${" 0".repeat(7_000)}`;
    const oversizedDiagram = Array.from({ length: 20 }, () => largePath);
    expect(() => createStrokeOrderDiagram("龍", oversizedDiagram)).toThrow("too large to render safely");
  });

  it("returns a base64 SVG data URI with intrinsic dimensions", () => {
    const diagram = createStrokeOrderDiagram("十", strokes);
    const decodedSvg = decodeSvg(diagram.dataUri);

    expect(diagram.width).toBeGreaterThan(0);
    expect(decodedSvg).toContain("<svg");
    expect(decodedSvg).toMatch(/height="\d+"/);
    expect(decodedSvg).toContain("Stroke order for 十");
  });
});

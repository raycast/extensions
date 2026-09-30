import { describe, expect, it } from "vitest";
import { resolveSvgRasterStrategy } from "../svg-raster-strategy";

describe("resolveSvgRasterStrategy", () => {
  it("uses the macOS raster backend for ordinary flowchart svg output", () => {
    const svg = `<svg>
<defs>
  <marker id="arrowhead" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
    <polygon points="0 0, 8 2.5, 0 5" fill="#000000" />
  </marker>
</defs>
<polyline points="0,0 10,10" marker-end="url(#arrowhead)" />
</svg>`;

    expect(resolveSvgRasterStrategy(svg)).toBe("macos");
  });

  it("uses the browser raster backend when sequence-style line markers are present", () => {
    const svg = `<svg>
<defs>
  <marker id="seq-arrow" markerWidth="8" markerHeight="5" refX="8" refY="2.5" orient="auto-start-reverse">
    <polygon points="0 0, 8 2.5, 0 5" fill="#000000" />
  </marker>
</defs>
<line x1="0" y1="0" x2="100" y2="0" marker-end="url(#seq-arrow)" />
</svg>`;

    expect(resolveSvgRasterStrategy(svg)).toBe("browser");
  });

  it("uses the browser raster backend for flowchart polylines with custom marker ids", () => {
    const svg = `<svg>
<defs>
  <marker id="arrowhead-237aa2f7" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
    <polygon points="0 0, 8 2.5, 0 5" fill="#7aa2f7" />
  </marker>
</defs>
<polyline points="0,0 10,10" stroke="#7aa2f7" marker-end="url(#arrowhead-237aa2f7)" />
</svg>`;

    expect(resolveSvgRasterStrategy(svg)).toBe("browser");
  });

  it("uses the browser raster backend for xychart line charts that rely on styled path strokes", () => {
    const svg = `<svg data-xychart-colors="1">
<style>
  .xychart-line { fill: none; stroke-width: 2.5; }
  path.xychart-color-0 { stroke: var(--xychart-color-0); }
</style>
<path d="M10,10 C20,20 30,20 40,10" class="xychart-line xychart-color-0" />
<circle cx="10" cy="10" r="4" class="xychart-dot xychart-color-0" />
</svg>`;

    expect(resolveSvgRasterStrategy(svg)).toBe("browser");
  });

  it("keeps default-marker flowchart polylines on the macOS raster backend", () => {
    const svg = `<svg>
<defs>
  <marker id="arrowhead" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
    <polygon points="0 0, 8 2.5, 0 5" fill="#000000" />
  </marker>
</defs>
<polyline points="0,0 10,10" stroke="#000000" marker-end="url(#arrowhead)" />
</svg>`;

    expect(resolveSvgRasterStrategy(svg)).toBe("macos");
  });

  it("keeps xychart bar-only charts on the macOS raster backend", () => {
    const svg = `<svg data-xychart-colors="1">
<style>
  .xychart-bar { stroke-width: 1.5; }
  .xychart-grid { fill: #d0d7de; }
</style>
<rect x="10" y="10" width="20" height="40" class="xychart-bar xychart-color-0" />
</svg>`;

    expect(resolveSvgRasterStrategy(svg)).toBe("macos");
  });
});

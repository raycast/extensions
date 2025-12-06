// SVG chart generation tests

import { generatePMFBarChart, svgToDataUri } from "../src/utils/svg-chart";

describe("generatePMFBarChart", () => {
  test("generates valid SVG", () => {
    const bins = [
      { label: "2", probability: 0.1 },
      { label: "3", probability: 0.2 },
    ];
    const svg = generatePMFBarChart(bins);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
  });

  test("handles empty bins", () => {
    const svg = generatePMFBarChart([]);
    expect(svg).toContain("No data");
  });

  test("includes title when provided", () => {
    const bins = [{ label: "1", probability: 1.0 }];
    const svg = generatePMFBarChart(bins, { title: "Test Chart" });
    expect(svg).toContain("Test Chart");
  });
});

describe("svgToDataUri", () => {
  test("converts SVG to data URI", () => {
    const svg = '<svg><rect/></svg>';
    const uri = svgToDataUri(svg);
    expect(uri).toStartWith("data:image/svg+xml,");
    expect(uri).toContain("svg");
  });
});

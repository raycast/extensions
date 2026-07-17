import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { renderWithBeautifulMermaid } from "../beautiful-mermaid";

describe("renderWithBeautifulMermaid", () => {
  it("writes svg output for a supported flowchart", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beautiful-mermaid-test-"));
    const outputPath = path.join(tempDir, "diagram.svg");

    await renderWithBeautifulMermaid(
      {
        code: "graph TD\nA-->B",
        format: "svg",
        requestedEngine: "beautiful",
        outputPath,
      },
      { themeName: "github-dark" },
    );

    const svg = fs.readFileSync(outputPath, "utf-8");
    expect(svg).toContain("<svg");
  });

  it("marks xychart line output for browser-backed rasterization", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beautiful-mermaid-test-"));
    const outputPath = path.join(tempDir, "xychart.svg");

    const result = await renderWithBeautifulMermaid(
      {
        code: `xychart-beta
    title "Planned vs Actual"
    x-axis [Jan, Feb, Mar, Apr]
    line [100, 145, 190, 240]
    line [90, 130, 185, 235]`,
        format: "svg",
        requestedEngine: "beautiful",
        outputPath,
      },
      { themeName: "github-dark" },
    );

    expect(result.svgRasterStrategy).toBe("browser");

    const svg = fs.readFileSync(outputPath, "utf-8");
    expect(svg).toContain('class="xychart-line');
  });

  it("marks linkStyle flowchart output for browser-backed rasterization when custom markers are emitted", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beautiful-mermaid-test-"));
    const outputPath = path.join(tempDir, "flowchart-linkstyle.svg");

    const result = await renderWithBeautifulMermaid(
      {
        code: `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Accept]
  B -->|No| D[Reject]
  C --> E[Done]
  D --> E
  linkStyle 0 stroke:#7aa2f7,stroke-width:3px
  linkStyle 1 stroke:#9ece6a,stroke-width:2px
  linkStyle 2 stroke:#f7768e,stroke-width:2px
  linkStyle default stroke:#565f89`,
        format: "svg",
        requestedEngine: "beautiful",
        outputPath,
      },
      { themeName: "github-dark" },
    );

    expect(result.svgRasterStrategy).toBe("browser");

    const svg = fs.readFileSync(outputPath, "utf-8");
    expect(svg).toContain('marker-end="url(#arrowhead-');
    expect(svg).toContain("<polyline");
  });
});

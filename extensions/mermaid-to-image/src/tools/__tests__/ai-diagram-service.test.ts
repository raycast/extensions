import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserBootstrapRequiredError } from "../../utils/browser-errors";
import { generateAiDiagramArtifact, resolveAiDiagramOptions } from "../ai-diagram-service";

describe("resolveAiDiagramOptions", () => {
  it("uses hybrid svg rendering for beautiful-mermaid supported syntax", () => {
    expect(resolveAiDiagramOptions("flowchart TD\nA-->B")).toEqual({
      outputFormat: "svg",
      renderEngine: "auto",
    });
  });

  it("falls back to compatible png rendering for unsupported syntax", () => {
    expect(resolveAiDiagramOptions("journey\ntitle Test")).toEqual({
      outputFormat: "png",
      renderEngine: "compatible",
    });
  });

  it("treats xychart-beta as supported hybrid svg syntax", () => {
    expect(
      resolveAiDiagramOptions(`xychart-beta
    title "Planned vs Actual"
    x-axis [Jan, Feb, Mar]
    line [100, 145, 190]`),
    ).toEqual({
      outputFormat: "svg",
      renderEngine: "auto",
    });
  });
});

describe("generateAiDiagramArtifact", () => {
  const generateDiagram = vi.fn();
  const copyGeneratedImage = vi.fn();
  const openInPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    copyGeneratedImage.mockResolvedValue(undefined);
    openInPreview.mockResolvedValue(undefined);
  });

  it("copies and opens svg output for supported syntax", async () => {
    generateDiagram.mockResolvedValue({
      outputPath: "/tmp/ai-flow.svg",
      format: "svg",
      engine: "beautiful",
      svgRasterStrategy: "macos",
    });

    const result = await generateAiDiagramArtifact(
      {
        mermaidSyntax: "flowchart TD\nA-->B",
        tempFileRef: { current: null },
        scale: 4,
        width: 2400,
      },
      {
        generateDiagram,
        copyGeneratedImage,
        openInPreview,
      },
    );

    expect(generateDiagram).toHaveBeenCalledWith(
      "flowchart TD\nA-->B",
      expect.any(Object),
      expect.objectContaining({
        outputFormat: "svg",
        renderEngine: "auto",
        usePersistentOutputDir: true,
      }),
    );
    expect(copyGeneratedImage).toHaveBeenCalledWith({
      format: "svg",
      imagePath: "/tmp/ai-flow.svg",
      svgRasterStrategy: "macos",
    });
    expect(openInPreview).toHaveBeenCalledWith("/tmp/ai-flow.svg");
    expect(result).toMatchObject({
      outputPath: "/tmp/ai-flow.svg",
      format: "svg",
      engine: "beautiful",
    });
    expect(result.message).toContain("Renderer: beautiful");
    expect(result.message).toContain("[Open in Preview](file:///tmp/ai-flow.svg)");
  });

  it("uses compatible png output for unsupported syntax", async () => {
    generateDiagram.mockResolvedValue({
      outputPath: "/tmp/ai-journey.png",
      format: "png",
      engine: "mmdc",
    });

    const result = await generateAiDiagramArtifact(
      {
        mermaidSyntax: "journey\ntitle Test",
        tempFileRef: { current: null },
      },
      {
        generateDiagram,
        copyGeneratedImage,
        openInPreview,
      },
    );

    expect(generateDiagram).toHaveBeenCalledWith(
      "journey\ntitle Test",
      expect.any(Object),
      expect.objectContaining({
        outputFormat: "png",
        renderEngine: "compatible",
        usePersistentOutputDir: true,
      }),
    );
    expect(copyGeneratedImage).toHaveBeenCalledWith({
      format: "png",
      imagePath: "/tmp/ai-journey.png",
      svgRasterStrategy: undefined,
    });
    expect(openInPreview).toHaveBeenCalledWith("/tmp/ai-journey.png");
    expect(result).toMatchObject({
      outputPath: "/tmp/ai-journey.png",
      format: "png",
      engine: "mmdc",
    });
    expect(result.message).toContain("Renderer: mmdc");
  });

  it("instructs the user to bootstrap the managed browser from the manual command", async () => {
    generateDiagram.mockRejectedValue(new BrowserBootstrapRequiredError());

    await expect(
      generateAiDiagramArtifact(
        {
          mermaidSyntax: "journey\ntitle Test",
          tempFileRef: { current: null },
        },
        {
          generateDiagram,
          copyGeneratedImage,
          openInPreview,
        },
      ),
    ).rejects.toThrow("Open Mermaid to Image once and choose Download Browser");

    expect(copyGeneratedImage).not.toHaveBeenCalled();
    expect(openInPreview).not.toHaveBeenCalled();
  });

  it("instructs the user to bootstrap the browser when svg clipboard rasterization needs it", async () => {
    generateDiagram.mockResolvedValue({
      outputPath: "/tmp/ai-sequence.svg",
      format: "svg",
      engine: "beautiful",
      svgRasterStrategy: "browser",
    });
    copyGeneratedImage.mockRejectedValue(new BrowserBootstrapRequiredError());

    await expect(
      generateAiDiagramArtifact(
        {
          mermaidSyntax: "sequenceDiagram\nAlice->>Bob: Hello",
          tempFileRef: { current: null },
        },
        {
          generateDiagram,
          copyGeneratedImage,
          openInPreview,
        },
      ),
    ).rejects.toThrow("This SVG image copy needs a browser");

    expect(openInPreview).not.toHaveBeenCalled();
  });

  it("passes browser raster strategy through for supported xychart svg output", async () => {
    generateDiagram.mockResolvedValue({
      outputPath: "/tmp/ai-xychart.svg",
      format: "svg",
      engine: "beautiful",
      svgRasterStrategy: "browser",
    });

    const result = await generateAiDiagramArtifact(
      {
        mermaidSyntax: `xychart-beta
    title "Planned vs Actual"
    x-axis [Jan, Feb, Mar]
    line [100, 145, 190]`,
        tempFileRef: { current: null },
      },
      {
        generateDiagram,
        copyGeneratedImage,
        openInPreview,
      },
    );

    expect(copyGeneratedImage).toHaveBeenCalledWith({
      format: "svg",
      imagePath: "/tmp/ai-xychart.svg",
      svgRasterStrategy: "browser",
    });
    expect(result.message).toContain("Renderer: beautiful");
  });
});

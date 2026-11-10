import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as raycast from "@raycast/api";
import * as ondine from "../../renderers/ondine";
import * as beautiful from "../../renderers/beautiful-mermaid";
import * as mmdc from "../../renderers/mmdc";
import { generateMermaidDiagram } from "../diagram";
import { generateAiDiagramArtifact } from "../../tools/ai-diagram-service";
import { copyDiagramImage, openDiagramFile, saveDiagramFile } from "../preview-actions";

const code = "mindmap\n root((Plan))\n  Build";

describe("diagram service Ondine Auto boundary", () => {
  beforeEach(() => {
    vi.spyOn(raycast, "getPreferenceValues").mockReturnValue({
      useOndineInAuto: true,
      outputFormat: "svg",
      renderEngine: "auto",
      beautifulTheme: "github-dark",
    });
    vi.spyOn(ondine, "renderWithOndine").mockImplementation(async (request) => ({
      engine: "ondine",
      format: request.format,
      outputPath: request.outputPath,
      svgRasterStrategy: "browser",
    }));
    vi.spyOn(beautiful, "renderWithBeautifulMermaid").mockImplementation(async (request) => ({
      engine: "beautiful",
      format: "svg",
      outputPath: request.outputPath,
    }));
    vi.spyOn(mmdc, "renderWithMmdc").mockImplementation(async (request) => ({
      engine: "mmdc",
      format: request.format,
      outputPath: request.outputPath,
    }));
  });

  afterEach(() => vi.restoreAllMocks());

  it("reads the preference and preserves raw source after cleaning Markdown fences", async () => {
    const originalSource = "```mermaid\n" + code + "\n```";
    const result = await generateMermaidDiagram(originalSource, { current: null });
    expect(result.engine).toBe("ondine");
    expect(ondine.renderWithOndine).toHaveBeenCalledWith(
      expect.objectContaining({ code: code + "\n", originalSource, useOndineInAuto: true }),
      { themeName: "github-dark", originalSource },
    );
    expect(mmdc.renderWithMmdc).not.toHaveBeenCalled();
  });

  it("explicit false overrides a globally enabled preference", async () => {
    expect((await generateMermaidDiagram(code, { current: null }, { useOndineInAuto: false })).engine).toBe("mmdc");
    expect(ondine.renderWithOndine).not.toHaveBeenCalled();
  });

  it("treats a missing preference as disabled", async () => {
    vi.mocked(raycast.getPreferenceValues).mockReturnValue({ outputFormat: "svg", renderEngine: "auto" });
    expect((await generateMermaidDiagram(code, { current: null })).engine).toBe("mmdc");
    expect(ondine.renderWithOndine).not.toHaveBeenCalled();
  });

  it("falls back without logging or toasting confidential Ondine diagnostics", async () => {
    vi.mocked(ondine.renderWithOndine).mockRejectedValue(new Error("ConfidentialDiagram source"));
    const info = vi.spyOn(console, "info");
    const error = vi.spyOn(console, "error");
    const toast = vi.spyOn(raycast, "showToast");
    expect((await generateMermaidDiagram(code, { current: null })).engine).toBe("mmdc");
    expect(ondine.renderWithOndine).toHaveBeenCalledTimes(1);
    expect(mmdc.renderWithMmdc).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledExactlyOnceWith("[mermaid-to-image] ondine-auto-fallback", {
      renderer: "ondine",
      fallbackRenderer: "mmdc",
      family: "mindmap",
      errorCode: "unexpected",
    });
    expect(error).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("forwards PNG timeout and keeps the AI non-Beautiful PNG path isolated", async () => {
    vi.mocked(raycast.getPreferenceValues).mockReturnValue({
      outputFormat: "png",
      renderEngine: "auto",
      useOndineInAuto: true,
      beautifulTheme: "github-dark",
      generationTimeout: "7",
    });
    expect(await generateMermaidDiagram(code, { current: null })).toMatchObject({ engine: "ondine", format: "png" });
    expect(ondine.renderWithOndine).toHaveBeenCalledWith(
      expect.objectContaining({ format: "png", useOndineInAuto: true }),
      { themeName: "github-dark", originalSource: code, timeoutMs: 7000 },
    );
    vi.mocked(ondine.renderWithOndine).mockClear();
    await generateAiDiagramArtifact(
      { mermaidSyntax: code, tempFileRef: { current: null } },
      {
        generateDiagram: (source, ref, options) =>
          generateMermaidDiagram(source, ref, { ...options, usePersistentOutputDir: false }),
        copyGeneratedImage: vi.fn(),
        openInPreview: vi.fn(),
      },
    );
    expect(ondine.renderWithOndine).not.toHaveBeenCalled();
    expect(mmdc.renderWithMmdc).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["svg", "copy"],
    ["svg", "save"],
    ["svg", "open"],
    ["png", "copy"],
    ["png", "save"],
    ["png", "open"],
  ] as const)("does not rerender successful Auto Ondine %s when %s fails", async (format, action) => {
    const result = await generateMermaidDiagram(code, { current: null }, { outputFormat: format });
    const failure = new Error("action failed");
    const sideEffect = vi.fn(() => {
      throw failure;
    });
    const runAction = async () => {
      if (action === "copy") {
        await copyDiagramImage({
          format,
          imagePath: result.outputPath,
          previewRasterPath: "/tmp/preview.png",
          copyRasterImage: sideEffect,
          resolveSvgCopy: async () => ({ path: "/tmp/preview.png", tempPaths: [] }),
        });
      } else if (action === "save") {
        saveDiagramFile({ imagePath: result.outputPath, format, fileExists: () => true, copyFile: sideEffect });
      } else {
        await openDiagramFile(result.outputPath, sideEffect);
      }
    };
    await expect(runAction()).rejects.toBe(failure);
    expect(sideEffect).toHaveBeenCalledTimes(1);
    expect(ondine.renderWithOndine).toHaveBeenCalledTimes(1);
    expect(mmdc.renderWithMmdc).not.toHaveBeenCalled();
  });

  it("keeps AI Beautiful failure on mmdc even when the preference is enabled", async () => {
    vi.mocked(beautiful.renderWithBeautifulMermaid).mockRejectedValue(new Error("beautiful failed"));
    await generateAiDiagramArtifact(
      { mermaidSyntax: "flowchart LR\n A --> B", tempFileRef: { current: null } },
      {
        generateDiagram: (source, ref, options) =>
          generateMermaidDiagram(source, ref, { ...options, usePersistentOutputDir: false }),
        copyGeneratedImage: vi.fn(),
        openInPreview: vi.fn(),
      },
    );
    expect(ondine.renderWithOndine).not.toHaveBeenCalled();
    expect(mmdc.renderWithMmdc).toHaveBeenCalledTimes(1);
  });

  it("does not retry renderers if AI copy fails after rendering", async () => {
    const failure = new Error("copy failed");
    const copy = vi.fn().mockRejectedValue(failure);
    const open = vi.fn();
    await expect(
      generateAiDiagramArtifact(
        { mermaidSyntax: "flowchart LR\n A --> B", tempFileRef: { current: null } },
        {
          generateDiagram: (source, ref, options) =>
            generateMermaidDiagram(source, ref, { ...options, usePersistentOutputDir: false }),
          copyGeneratedImage: copy,
          openInPreview: open,
        },
      ),
    ).rejects.toBe(failure);
    expect(beautiful.renderWithBeautifulMermaid).toHaveBeenCalledTimes(1);
    expect(ondine.renderWithOndine).not.toHaveBeenCalled();
    expect(mmdc.renderWithMmdc).not.toHaveBeenCalled();
    expect(copy).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });
});

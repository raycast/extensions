import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserBootstrapRequiredError } from "../browser-errors";
import * as browserManager from "../browser-manager";
import {
  buildManualDiagramRequest,
  runManualDiagramGeneration,
  type ManualDiagramExecutionOptions,
} from "../manual-command-service";
import * as diagram from "../diagram";
import { ResolvedMermaidInput } from "../mermaid-input";

describe("runManualDiagramGeneration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const tempFileRef = { current: null as string | null };
  const baseInput: ResolvedMermaidInput = {
    code: "flowchart TD\nA --> B",
    source: "selected",
  };
  const baseOptions: ManualDiagramExecutionOptions = {
    preferences: {
      outputFormat: "svg",
      renderEngine: "auto",
    },
    tempFileRef,
  };

  it("returns browser setup when compatible rendering needs a browser and none is available", async () => {
    vi.spyOn(browserManager, "resolveCompatibleBrowser").mockResolvedValue({ source: "missing" });

    const result = await runManualDiagramGeneration(baseInput, {
      ...baseOptions,
      preferences: { outputFormat: "svg", renderEngine: "compatible" },
    });

    expect(result).toEqual({
      kind: "browser-setup",
      setup: {
        input: baseInput,
        reason: "Compatible mode was selected, and it needs a browser binary.",
      },
    });
  });

  it("returns success when rendering succeeds", async () => {
    vi.spyOn(browserManager, "resolveCompatibleBrowser").mockResolvedValue({
      source: "environment",
      executablePath: "/usr/bin/chromium",
    });
    vi.spyOn(diagram, "generateMermaidDiagram").mockResolvedValue({
      outputPath: "/tmp/diagram.svg",
      format: "svg",
      engine: "beautiful",
      svgRasterStrategy: "macos",
    });

    const result = await runManualDiagramGeneration(baseInput, baseOptions);

    expect(result).toMatchObject({
      kind: "success",
      result: {
        outputPath: "/tmp/diagram.svg",
        format: "svg",
        engine: "beautiful",
        svgRasterStrategy: "macos",
      },
      mermaidCode: baseInput.code,
    });
  });

  it("converts browser bootstrap required errors into browser setup state", async () => {
    vi.spyOn(browserManager, "resolveCompatibleBrowser").mockResolvedValue({
      source: "managed",
      executablePath: "/opt/chrome",
      version: "1.0.0",
    });
    vi.spyOn(diagram, "generateMermaidDiagram").mockRejectedValue(
      new BrowserBootstrapRequiredError("Browser is required for compatible rendering."),
    );

    const request = buildManualDiagramRequest(baseInput.code, { outputFormat: "svg", renderEngine: "auto" });
    expect(request.outputPath).toBe("");

    const result = await runManualDiagramGeneration(baseInput, {
      ...baseOptions,
      preferences: { outputFormat: "png", renderEngine: "auto" },
    });

    expect(result).toEqual({
      kind: "browser-setup",
      setup: {
        input: baseInput,
        reason: "Compatible rendering still needs a browser binary for this request.",
      },
    });
  });

  it("returns browser setup when svg preview fidelity needs browser-backed rasterization", async () => {
    vi.spyOn(browserManager, "resolveCompatibleBrowser").mockResolvedValue({ source: "missing" });
    vi.spyOn(diagram, "generateMermaidDiagram").mockResolvedValue({
      outputPath: "/tmp/diagram.svg",
      format: "svg",
      engine: "beautiful",
      svgRasterStrategy: "browser",
    });

    const result = await runManualDiagramGeneration(baseInput, baseOptions);

    expect(result).toEqual({
      kind: "browser-setup",
      setup: {
        input: baseInput,
        reason: "This SVG preview and image copy need a browser-backed rasterizer for correct fidelity.",
      },
    });
  });
});

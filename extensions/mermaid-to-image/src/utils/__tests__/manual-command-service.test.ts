import { afterEach, describe, expect, it, vi } from "vitest";
import { getOndineRuntime } from "../../renderers/ondine-runtime";
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

  it.each(["syntax", "semantic"])(
    "shows real Ondine %s diagnostics without fabricated locations or logging source",
    async (kind) => {
      const runtime = await getOndineRuntime();
      let failure: unknown;
      try {
        runtime.render(kind === "syntax" ? "flowchart TD\nA -->" : "sequenceDiagram\n deactivate A");
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeDefined();
      const logs = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.spyOn(diagram, "generateMermaidDiagram").mockRejectedValue(failure);
      const state = await runManualDiagramGeneration(baseInput, {
        ...baseOptions,
        skipBrowserCheck: true,
        preferences: { outputFormat: "svg", renderEngine: "ondine" },
      });
      expect(state.kind).toBe("error");
      if (state.kind !== "error") return;
      expect(state.error).toBe(failure);
      expect(state.message).toContain(`Ondine ${kind}`);
      expect(state.message).not.toContain("line 0");
      expect(state.message).not.toContain("column 0");
      if (kind === "syntax") expect(state.message).toContain("line 3");
      expect(JSON.stringify(logs.mock.calls)).not.toContain("deactivate");
      expect(JSON.stringify(logs.mock.calls)).not.toContain("A -->");
    },
  );

  it("preserves Ondine metadata and forwards the explicit SVG request", async () => {
    const result = {
      outputPath: "/tmp/ondine.svg",
      format: "svg" as const,
      engine: "ondine" as const,
      svgRasterStrategy: "browser" as const,
      rendererMetadata: { version: "0.0.3", theme: "github-dark", warnings: ["theme warning"] },
    };
    const generate = vi.spyOn(diagram, "generateMermaidDiagram").mockResolvedValue(result);
    const state = await runManualDiagramGeneration(baseInput, {
      ...baseOptions,
      preferences: { outputFormat: "svg", renderEngine: "ondine" },
      resolveCompatibleBrowser: async () => ({ source: "environment", executablePath: "/chrome" }),
    });
    expect(state).toMatchObject({ kind: "success", result });
    expect(generate).toHaveBeenCalledWith(baseInput.code, tempFileRef, {
      renderEngine: "ondine",
      outputFormat: "svg",
      useOndineInAuto: false,
    });
  });

  it.each([true, false])("forwards Auto opt-in %s consistently from the preflight request", async (useOndineInAuto) => {
    const input = { ...baseInput, code: "mindmap\n root((Plan))" };
    const preferences = { outputFormat: "svg" as const, renderEngine: "auto" as const, useOndineInAuto };
    const generate = vi.spyOn(diagram, "generateMermaidDiagram").mockResolvedValue({
      outputPath: "/tmp/auto.svg",
      format: "svg",
      engine: useOndineInAuto ? "ondine" : "mmdc",
      svgRasterStrategy: "browser",
    });
    const request = buildManualDiagramRequest(input.code, preferences);
    expect(request).toMatchObject({ useOndineInAuto, originalSource: input.code });
    const result = await runManualDiagramGeneration(input, {
      ...baseOptions,
      preferences,
      resolveCompatibleBrowser: async () => ({ source: "environment", executablePath: "/chrome" }),
    });
    expect(result.kind).toBe("success");
    expect(generate).toHaveBeenCalledWith(input.code, tempFileRef, {
      renderEngine: "auto",
      outputFormat: "svg",
      useOndineInAuto,
    });
  });

  it("requires a browser before rendering opted-in Ondine PNG", async () => {
    const generate = vi.spyOn(diagram, "generateMermaidDiagram");
    const input = { ...baseInput, code: "mindmap\n root((Plan))" };
    const state = await runManualDiagramGeneration(input, {
      ...baseOptions,
      preferences: { outputFormat: "png", renderEngine: "auto", useOndineInAuto: true },
      resolveCompatibleBrowser: async () => ({ source: "missing" }),
    });
    expect(state).toEqual({
      kind: "browser-setup",
      setup: { input, reason: "Ondine PNG output needs a browser-backed rasterizer." },
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("preserves Auto PNG metadata and uses only the preflight browser check", async () => {
    const input = { ...baseInput, code: "mindmap\n root((Plan))" };
    const result = {
      outputPath: "/tmp/auto.png",
      format: "png" as const,
      engine: "ondine" as const,
      rendererMetadata: { version: "0.0.3", theme: "github-dark", warnings: [] },
    };
    const generate = vi.spyOn(diagram, "generateMermaidDiagram").mockResolvedValue(result);
    const resolveBrowser = vi.fn(async () => ({ source: "environment" as const, executablePath: "/chrome" }));
    const state = await runManualDiagramGeneration(input, {
      ...baseOptions,
      preferences: { outputFormat: "png", renderEngine: "auto", useOndineInAuto: true },
      resolveCompatibleBrowser: resolveBrowser,
    });
    expect(state).toMatchObject({ kind: "success", result });
    expect(generate).toHaveBeenCalledExactlyOnceWith(input.code, tempFileRef, {
      renderEngine: "auto",
      outputFormat: "png",
      useOndineInAuto: true,
    });
    expect(resolveBrowser).toHaveBeenCalledTimes(1);
  });

  it("still requires browser setup after an opt-in Ondine SVG succeeds", async () => {
    const generate = vi.spyOn(diagram, "generateMermaidDiagram").mockResolvedValue({
      outputPath: "/tmp/auto.svg",
      format: "svg",
      engine: "ondine",
      svgRasterStrategy: "browser",
    });
    const result = await runManualDiagramGeneration(
      { ...baseInput, code: "mindmap\n root((Plan))" },
      {
        ...baseOptions,
        preferences: { outputFormat: "svg", renderEngine: "auto", useOndineInAuto: true },
        resolveCompatibleBrowser: async () => ({ source: "missing" }),
      },
    );
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      kind: "browser-setup",
      setup: { reason: expect.stringContaining("preview and image copy") },
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

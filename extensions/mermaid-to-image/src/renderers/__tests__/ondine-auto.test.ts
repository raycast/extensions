import { afterEach, describe, expect, it, vi } from "vitest";
import { renderDiagramWithHybridStrategy } from "../hybrid-strategy";
import { resolveRenderer } from "../select-renderer";
import { getOndineDiagnostic, getOndineRuntime } from "../ondine-runtime";
import type { DiagramRequest, DiagramResult } from "../types";

const request: DiagramRequest = {
  code: "mindmap\n root((開發計畫))\n  技術驗證\n  測試與發布",
  format: "svg",
  requestedEngine: "auto",
  outputPath: "/tmp/auto.svg",
  useOndineInAuto: true,
};

function dependencies() {
  const result: DiagramResult = {
    engine: "ondine",
    format: "svg",
    outputPath: request.outputPath,
    svgRasterStrategy: "browser",
    rendererMetadata: { version: "0.0.3", theme: "github-dark", warnings: [] },
  };
  return {
    renderBeautiful: vi.fn().mockResolvedValue({ ...result, engine: "beautiful" }),
    renderOndine: vi.fn().mockResolvedValue(result),
    renderMmdc: vi.fn().mockResolvedValue({ engine: "mmdc", format: "svg", outputPath: request.outputPath }),
    notifyAutoFallback: vi.fn(),
  };
}

describe("opt-in Ondine Auto SVG and PNG", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    "mindmap",
    "timeline",
    "journey",
    "gantt",
    "pie",
    "gitGraph",
    "quadrantChart",
    "sankey-beta",
    "block-beta",
    "packet-beta",
    "kanban",
    "architecture-beta",
    "requirementDiagram",
    "C4Context",
    "radar-beta",
    "treemap-beta",
    "info",
  ])("allows the reviewed %s family", (header) => {
    expect(resolveRenderer({ ...request, code: header + "\n" })).toBe("ondine");
  });
  it.each([undefined, false])("keeps the old route when opt-in is %s", async (useOndineInAuto) => {
    const deps = dependencies();
    const result = await renderDiagramWithHybridStrategy({ ...request, useOndineInAuto }, deps);
    expect(result.engine).toBe("mmdc");
    expect(deps.renderOndine).not.toHaveBeenCalled();
  });

  it("returns Ondine metadata and browser strategy without invoking another renderer", async () => {
    const deps = dependencies();
    const result = await renderDiagramWithHybridStrategy(request, deps);
    expect(resolveRenderer(request)).toBe("ondine");
    expect(result).toBe(await deps.renderOndine.mock.results[0].value);
    expect(result).toMatchObject({
      engine: "ondine",
      svgRasterStrategy: "browser",
      rendererMetadata: { version: "0.0.3" },
    });
    expect(deps.renderOndine).toHaveBeenCalledExactlyOnceWith(request);
    expect(deps.renderBeautiful).not.toHaveBeenCalled();
    expect(deps.renderMmdc).not.toHaveBeenCalled();
    expect(deps.notifyAutoFallback).not.toHaveBeenCalled();
  });

  it("preserves Beautiful success and its existing mmdc fallback even with opt-in enabled", async () => {
    const deps = dependencies();
    const flow = { ...request, code: "flowchart LR\n A --> B" };
    expect((await renderDiagramWithHybridStrategy(flow, deps)).engine).toBe("beautiful");
    deps.renderBeautiful.mockRejectedValueOnce(new Error("beautiful failed"));
    expect((await renderDiagramWithHybridStrategy(flow, deps)).engine).toBe("mmdc");
    expect(deps.renderOndine).not.toHaveBeenCalled();
    expect(deps.notifyAutoFallback).toHaveBeenCalledTimes(1);
  });

  it.each(["compatible", "beautiful"] as const)("does not enroll %s in Ondine Auto", async (mode) => {
    const deps = dependencies();
    const current = { ...request, requestedEngine: mode, code: "flowchart LR\n A --> B" };
    await renderDiagramWithHybridStrategy(current, deps);
    expect(deps.renderOndine).not.toHaveBeenCalled();
  });

  it("enrolls PNG only for opted-in non-Beautiful families", async () => {
    const current = { ...request, format: "png" as const, outputPath: "/tmp/auto.png" };
    const deps = dependencies();
    deps.renderOndine.mockResolvedValue({ engine: "ondine", format: "png", outputPath: current.outputPath });
    expect(await renderDiagramWithHybridStrategy(current, deps)).toMatchObject({ engine: "ondine", format: "png" });
    expect(deps.renderOndine).toHaveBeenCalledExactlyOnceWith(current);
    for (const useOndineInAuto of [undefined, false]) {
      expect(resolveRenderer({ ...current, useOndineInAuto })).toBe("mmdc");
    }
    for (const code of ["flowchart LR\n A --> B", "%% comment\nsequenceDiagram\n A->>B: Hi"]) {
      expect(resolveRenderer({ ...current, code })).toBe("mmdc");
    }
    for (const originalSource of [
      '%%{init: {"theme":"dark"}}%%\n' + request.code,
      "---\ntitle: Plan\n---\n" + request.code,
    ]) {
      expect(resolveRenderer({ ...current, originalSource })).toBe("mmdc");
    }
    expect(resolveRenderer({ ...current, code: "unknownDiagram" })).toBe("mmdc");
  });

  it.each(["browser", "timeout", "invalid PNG", "output write"])("falls back once on PNG %s failure", async (stage) => {
    const current = { ...request, format: "png" as const, outputPath: "/tmp/auto.png" };
    const deps = dependencies();
    deps.renderOndine.mockRejectedValue(new Error(stage + " ConfidentialDiagram"));
    deps.renderMmdc.mockResolvedValue({ engine: "mmdc", format: "png", outputPath: current.outputPath });
    expect(await renderDiagramWithHybridStrategy(current, deps)).toEqual({
      engine: "mmdc",
      format: "png",
      outputPath: current.outputPath,
    });
    expect(deps.renderOndine).toHaveBeenCalledExactlyOnceWith(current);
    expect(deps.renderMmdc).toHaveBeenCalledExactlyOnceWith(current);
    expect(deps.notifyAutoFallback).not.toHaveBeenCalled();
    const failure = new Error("final mmdc failure");
    deps.renderMmdc.mockRejectedValueOnce(failure);
    await expect(renderDiagramWithHybridStrategy(current, deps)).rejects.toBe(failure);
    expect(deps.renderMmdc).toHaveBeenCalledTimes(2);
  });

  it.each([
    '%%{init: {"theme":"dark"}}%%\nmindmap\n root((Plan))',
    '%%{init: {"flowchart":{"curve":"linear"}}}%%\nmindmap\n root((Plan))',
    "---\nconfig:\n  theme: dark\n---\nmindmap\n root((Plan))",
    "---\nconfig: {theme: dark}\n---\nmindmap\n root((Plan))",
    "---\ntitle: Plan\n---\nmindmap\n root((Plan))",
    "---\nunterminated frontmatter",
  ])("bypasses embedded configuration conservatively: %s", async (code) => {
    const deps = dependencies();
    expect((await renderDiagramWithHybridStrategy({ ...request, code }, deps)).engine).toBe("mmdc");
    expect(deps.renderOndine).not.toHaveBeenCalled();
  });

  it("checks original source even when the render code no longer has its directives", async () => {
    const deps = dependencies();
    const originalSource = '%%{init: {"theme":"dark"}}%%\n' + request.code;
    expect((await renderDiagramWithHybridStrategy({ ...request, originalSource }, deps)).engine).toBe("mmdc");
    expect(deps.renderOndine).not.toHaveBeenCalled();
  });

  it.each(["mindmapper", "timeline-v99", "C4Container", "unknownDiagram"])(
    "keeps unqualified header %s on mmdc",
    async (header) => {
      const deps = dependencies();
      await renderDiagramWithHybridStrategy({ ...request, code: header }, deps);
      expect(deps.renderOndine).not.toHaveBeenCalled();
      expect(deps.renderMmdc).toHaveBeenCalledTimes(1);
    },
  );

  it("allows normal comments without treating label text as configuration", async () => {
    const deps = dependencies();
    await renderDiagramWithHybridStrategy(
      { ...request, code: "%% normal comment\n\nmindmap\n root((theme: dark))" },
      deps,
    );
    expect(deps.renderOndine).toHaveBeenCalledTimes(1);
  });

  it.each([
    "syntax",
    "semantic",
    "unsupported-diagram",
    "limit",
    "initialization",
    "materialization",
    "write",
    "unknown",
  ])("silently falls back on an Ondine %s failure", async (kind) => {
    const deps = dependencies();
    deps.renderOndine.mockRejectedValue({ code: kind, message: "ConfidentialDiagram", snippet: request.code });
    const result = await renderDiagramWithHybridStrategy(request, deps);
    expect(result.engine).toBe("mmdc");
    expect(deps.renderOndine).toHaveBeenCalledExactlyOnceWith(request);
    expect(deps.renderMmdc).toHaveBeenCalledExactlyOnceWith(request);
    expect(deps.notifyAutoFallback).not.toHaveBeenCalled();
  });

  it.each([
    ["syntax", "flowchart TD\nA -->", undefined],
    ["semantic", "sequenceDiagram\n deactivate A", undefined],
    ["unsupported-diagram", "not-a-diagram", undefined],
    ["limit", "flowchart LR\nA --> B", { limit: 2 }],
  ] as const)("handles a real %s RenderError without leaking it to the notifier", async (code, source, options) => {
    const runtime = await getOndineRuntime();
    let failure: unknown;
    try {
      runtime.render(source, options);
    } catch (error) {
      failure = error;
    }
    expect(getOndineDiagnostic(failure)).toMatchObject({ code });
    const deps = dependencies();
    const info = vi.spyOn(console, "info");
    deps.renderOndine.mockRejectedValue(failure);
    expect((await renderDiagramWithHybridStrategy(request, deps)).engine).toBe("mmdc");
    expect(info).toHaveBeenCalledExactlyOnceWith("[mermaid-to-image] ondine-auto-fallback", {
      renderer: "ondine",
      fallbackRenderer: "mmdc",
      family: "mindmap",
      errorCode: code,
    });
    expect(deps.renderOndine).toHaveBeenCalledTimes(1);
    expect(deps.notifyAutoFallback).not.toHaveBeenCalled();
  });

  it("falls back when the optional renderer dependency is unavailable", async () => {
    const deps = dependencies();
    expect((await renderDiagramWithHybridStrategy(request, { ...deps, renderOndine: undefined })).engine).toBe("mmdc");
  });

  it("propagates the final mmdc error without retrying or returning Ondine metadata", async () => {
    const deps = dependencies();
    const failure = new Error("mmdc failed");
    deps.renderOndine.mockRejectedValue(new Error("ondine failed"));
    deps.renderMmdc.mockRejectedValue(failure);
    await expect(renderDiagramWithHybridStrategy(request, deps)).rejects.toBe(failure);
    expect(deps.renderMmdc).toHaveBeenCalledTimes(1);
  });

  it("never falls back for explicit Ondine, even when Auto opt-in is enabled", async () => {
    const deps = dependencies();
    const failure = new Error("manual failure");
    deps.renderOndine.mockRejectedValue(failure);
    await expect(renderDiagramWithHybridStrategy({ ...request, requestedEngine: "ondine" }, deps)).rejects.toBe(
      failure,
    );
    expect(deps.renderMmdc).not.toHaveBeenCalled();
  });
});

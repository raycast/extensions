import { describe, expect, it, vi } from "vitest";
import { renderDiagramWithHybridStrategy } from "../hybrid-strategy";
import { DiagramRequest } from "../types";

describe("renderDiagramWithHybridStrategy", () => {
  it("uses beautiful in auto mode for supported svg", async () => {
    const request: DiagramRequest = {
      code: "graph TD\nA-->B",
      format: "svg",
      requestedEngine: "auto",
      outputPath: "/tmp/diagram.svg",
    };

    const renderBeautiful = vi.fn().mockResolvedValue({
      engine: "beautiful",
      format: "svg",
      outputPath: request.outputPath,
    });
    const renderMmdc = vi.fn();

    const result = await renderDiagramWithHybridStrategy(request, {
      renderBeautiful,
      renderMmdc,
    });

    expect(result.engine).toBe("beautiful");
    expect(renderBeautiful).toHaveBeenCalledTimes(1);
    expect(renderMmdc).not.toHaveBeenCalled();
  });

  it("falls back to mmdc when beautiful fails in auto mode", async () => {
    const request: DiagramRequest = {
      code: "graph TD\nA-->B",
      format: "svg",
      requestedEngine: "auto",
      outputPath: "/tmp/diagram.svg",
    };

    const renderBeautiful = vi.fn().mockRejectedValue(new Error("beautiful renderer failed"));
    const renderMmdc = vi.fn().mockResolvedValue({
      engine: "mmdc",
      format: "svg",
      outputPath: request.outputPath,
    });
    const notifyAutoFallback = vi.fn().mockResolvedValue(undefined);

    const result = await renderDiagramWithHybridStrategy(request, {
      renderBeautiful,
      renderMmdc,
      notifyAutoFallback,
    });

    expect(result.engine).toBe("mmdc");
    expect(renderBeautiful).toHaveBeenCalledTimes(1);
    expect(renderMmdc).toHaveBeenCalledTimes(1);
    expect(notifyAutoFallback).toHaveBeenCalledTimes(1);
  });

  it("fails fast in forced beautiful mode for unsupported syntax", async () => {
    const request: DiagramRequest = {
      code: "journey\ntitle Daily routine",
      format: "svg",
      requestedEngine: "beautiful",
      outputPath: "/tmp/diagram.svg",
    };

    const renderBeautiful = vi.fn();
    const renderMmdc = vi.fn();

    await expect(
      renderDiagramWithHybridStrategy(request, {
        renderBeautiful,
        renderMmdc,
      }),
    ).rejects.toThrow("beautiful-mermaid does not support this Mermaid syntax yet");

    expect(renderBeautiful).not.toHaveBeenCalled();
    expect(renderMmdc).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import {
  createFatalManualCommandState,
  createIdleManualCommandState,
  createInitialManualCommandState,
  createPendingManualCommandState,
  mapManualGenerationStateToCommandState,
} from "../manual-command-state";

describe("manual-command-state", () => {
  it("builds the initial loading state from the default format", () => {
    expect(createInitialManualCommandState("svg")).toEqual({
      isLoading: true,
      error: null,
      browserSetup: null,
      imagePath: null,
      imageFormat: "svg",
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    });
  });

  it("maps successful generation into preview state", () => {
    const nextState = mapManualGenerationStateToCommandState(createInitialManualCommandState("svg"), {
      kind: "success",
      mermaidCode: "flowchart TD\nA --> B",
      result: {
        outputPath: "/tmp/diagram.svg",
        format: "svg",
        engine: "beautiful",
        svgRasterStrategy: "browser",
      },
    });

    expect(nextState).toEqual({
      isLoading: false,
      error: null,
      browserSetup: null,
      imagePath: "/tmp/diagram.svg",
      imageFormat: "svg",
      engineUsed: "beautiful",
      svgRasterStrategy: "browser",
      mermaidCode: "flowchart TD\nA --> B",
    });
  });

  it("maps browser setup and error states by clearing preview payloads", () => {
    const readyState = mapManualGenerationStateToCommandState(createInitialManualCommandState("png"), {
      kind: "success",
      mermaidCode: "graph TD\nA --> B",
      result: {
        outputPath: "/tmp/diagram.png",
        format: "png",
        engine: "mmdc",
      },
    });

    const setupState = mapManualGenerationStateToCommandState(readyState, {
      kind: "browser-setup",
      setup: {
        input: { code: "graph TD\nA --> B", source: "clipboard" },
        reason: "Compatible mode was selected, and it needs a browser binary.",
      },
    });

    expect(setupState).toEqual({
      isLoading: false,
      error: null,
      browserSetup: {
        input: { code: "graph TD\nA --> B", source: "clipboard" },
        reason: "Compatible mode was selected, and it needs a browser binary.",
      },
      imagePath: null,
      imageFormat: "png",
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    });

    expect(createFatalManualCommandState(setupState, "boom")).toEqual({
      isLoading: false,
      error: "boom",
      browserSetup: null,
      imagePath: null,
      imageFormat: "png",
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    });
  });

  it("reuses the current format while toggling loading and reset states", () => {
    const pendingState = createPendingManualCommandState({
      ...createInitialManualCommandState("svg"),
      isLoading: false,
      imagePath: "/tmp/old.svg",
      engineUsed: "beautiful",
      svgRasterStrategy: "macos",
      mermaidCode: "flowchart TD\nA --> B",
    });

    expect(pendingState).toEqual({
      isLoading: true,
      error: null,
      browserSetup: null,
      imagePath: null,
      imageFormat: "svg",
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    });

    expect(createIdleManualCommandState("png")).toEqual({
      isLoading: false,
      error: null,
      browserSetup: null,
      imagePath: null,
      imageFormat: "png",
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    });
  });
});

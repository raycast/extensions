import { afterEach, describe, expect, it, vi } from "vitest";
import { createManualCommandController } from "../manual-command-controller";
import { createInitialManualCommandState, type ManualCommandState } from "../manual-command-state";
import type { ManualGenerationState } from "../manual-command-service";
import type { ResolvedMermaidInput } from "../mermaid-input";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createStateHarness(initialState = createInitialManualCommandState("svg")) {
  let currentState = initialState;

  const setState = vi.fn((update: ManualCommandState | ((previous: ManualCommandState) => ManualCommandState)) => {
    currentState = typeof update === "function" ? update(currentState) : update;
  });

  return {
    getState: () => currentState,
    setState,
  };
}

function createControllerHarness(overrides?: {
  initialState?: ManualCommandState;
  selectionInput?: ResolvedMermaidInput;
  clipboardInput?: ResolvedMermaidInput;
  generationResult?: ManualGenerationState;
}) {
  const stateHarness = createStateHarness(overrides?.initialState);
  const tempFileRef = { current: null as string | null };
  const activeImagePathRef = { current: null as string | null };
  const browserSetupInputRef = { current: null as ResolvedMermaidInput | null };
  const toast = { message: "", title: "", style: "animated" };
  const selectionInput = overrides?.selectionInput ?? { code: "flowchart TD\nA --> B", source: "selected" };
  const clipboardInput = overrides?.clipboardInput ?? { code: "flowchart TD\nB --> C", source: "clipboard" };
  const generationResult =
    overrides?.generationResult ??
    ({
      kind: "success",
      mermaidCode: selectionInput.code,
      result: {
        outputPath: "/tmp/diagram.svg",
        format: "svg",
        engine: "beautiful",
        svgRasterStrategy: "macos",
      },
    } satisfies ManualGenerationState);

  const services = {
    resolveSelectionInput: vi.fn().mockResolvedValue(selectionInput),
    resolveClipboardOnlyInput: vi.fn().mockResolvedValue(clipboardInput),
    runManualDiagramGeneration: vi.fn().mockResolvedValue(generationResult),
    installManagedBrowser: vi.fn().mockResolvedValue({
      source: "managed",
      executablePath: "/tmp/browser",
      version: "131.0.0",
      installRoot: "/tmp/browser-cache",
    }),
    getManagedBrowserSupportRoot: vi.fn().mockReturnValue("/tmp/browser-cache"),
    notifyManualGenerationStarted: vi.fn().mockResolvedValue(undefined),
    notifyManualGenerationSuccess: vi.fn().mockResolvedValue(undefined),
    notifyManualGenerationFailure: vi.fn().mockResolvedValue(undefined),
    notifyManagedBrowserDownloadStarted: vi.fn().mockResolvedValue(toast),
    notifyManagedBrowserDownloadProgress: vi.fn(),
    notifyManagedBrowserDownloadSuccess: vi.fn(),
    notifyManagedBrowserDownloadFailure: vi.fn().mockResolvedValue(undefined),
    notifyManualGenerationCancelled: vi.fn().mockResolvedValue(undefined),
    cleanupTempFile: vi.fn(),
    logOperationalError: vi.fn(),
  };

  const controller = createManualCommandController({
    preferences: {
      outputFormat: "svg",
      renderEngine: "auto",
    },
    defaultFormat: "svg",
    setState: stateHarness.setState,
    tempFileRef,
    activeImagePathRef,
    browserSetupInputRef,
    environmentSupportPath: "/tmp/support",
    services,
  });

  return {
    controller,
    services,
    tempFileRef,
    activeImagePathRef,
    browserSetupInputRef,
    getState: stateHarness.getState,
    selectionInput,
    clipboardInput,
    generationResult,
    toast,
  };
}

describe("manual-command-controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs generation from selection, updates preview state, and replaces the active image path", async () => {
    const harness = createControllerHarness();
    harness.activeImagePathRef.current = "/tmp/old.svg";

    await harness.controller.actions.runFromSelection();

    expect(harness.services.resolveSelectionInput).toHaveBeenCalledTimes(1);
    expect(harness.services.runManualDiagramGeneration).toHaveBeenCalledWith(harness.selectionInput, {
      preferences: {
        outputFormat: "svg",
        renderEngine: "auto",
      },
      tempFileRef: harness.tempFileRef,
    });
    expect(harness.services.cleanupTempFile).toHaveBeenCalledWith("/tmp/old.svg");
    expect(harness.services.notifyManualGenerationStarted).toHaveBeenCalledWith("selected");
    expect(harness.services.notifyManualGenerationSuccess).toHaveBeenCalledWith("selected", "beautiful");
    expect(harness.getState()).toMatchObject({
      isLoading: false,
      imagePath: "/tmp/diagram.svg",
      engineUsed: "beautiful",
      mermaidCode: harness.selectionInput.code,
    });
  });

  it("runs clipboard-only generation without resolving selected text", async () => {
    const harness = createControllerHarness();

    await harness.controller.actions.runFromClipboardOnly();

    expect(harness.services.resolveClipboardOnlyInput).toHaveBeenCalledTimes(1);
    expect(harness.services.resolveSelectionInput).not.toHaveBeenCalled();
    expect(harness.services.runManualDiagramGeneration).toHaveBeenCalledWith(harness.clipboardInput, {
      preferences: {
        outputFormat: "svg",
        renderEngine: "auto",
      },
      tempFileRef: harness.tempFileRef,
    });
  });

  it("retries the stored browser setup input", async () => {
    const harness = createControllerHarness({
      generationResult: {
        kind: "browser-setup",
        setup: {
          input: { code: "flowchart TD\nA --> B", source: "selected" },
          reason: "Need browser",
        },
      },
    });

    await harness.controller.actions.runFromSelection();
    expect(harness.browserSetupInputRef.current).toEqual(harness.selectionInput);

    harness.services.runManualDiagramGeneration.mockResolvedValueOnce({
      kind: "success",
      mermaidCode: harness.selectionInput.code,
      result: {
        outputPath: "/tmp/retried.svg",
        format: "svg",
        engine: "beautiful",
      },
    });

    await harness.controller.actions.retryBrowserSetup();

    expect(harness.services.runManualDiagramGeneration).toHaveBeenLastCalledWith(harness.selectionInput, {
      preferences: {
        outputFormat: "svg",
        renderEngine: "auto",
      },
      tempFileRef: harness.tempFileRef,
    });
  });

  it("downloads the managed browser, reports progress, and retries the pending input", async () => {
    const harness = createControllerHarness({
      generationResult: {
        kind: "browser-setup",
        setup: {
          input: { code: "sequenceDiagram\nA->>B: hi", source: "selected" },
          reason: "Need browser",
        },
      },
    });

    await harness.controller.actions.runFromSelection();

    harness.services.runManualDiagramGeneration.mockResolvedValueOnce({
      kind: "success",
      mermaidCode: harness.selectionInput.code,
      result: {
        outputPath: "/tmp/retried.svg",
        format: "svg",
        engine: "beautiful",
        svgRasterStrategy: "browser",
      },
    });

    harness.services.installManagedBrowser.mockImplementationOnce(async ({ onProgress }) => {
      onProgress?.(512, 1024);
      return {
        source: "managed",
        executablePath: "/tmp/browser",
        version: "131.0.0",
        installRoot: "/tmp/browser-cache",
      };
    });

    await harness.controller.actions.downloadManagedBrowserAndRetry();

    expect(harness.services.notifyManagedBrowserDownloadStarted).toHaveBeenCalledTimes(1);
    expect(harness.services.notifyManagedBrowserDownloadProgress).toHaveBeenCalledWith(harness.toast, "512 B / 1.0 KB");
    expect(harness.services.notifyManagedBrowserDownloadSuccess).toHaveBeenCalledWith(
      harness.toast,
      "managed",
      "/tmp/browser-cache",
    );
    expect(harness.services.runManualDiagramGeneration).toHaveBeenLastCalledWith(harness.selectionInput, {
      preferences: {
        outputFormat: "svg",
        renderEngine: "auto",
      },
      tempFileRef: harness.tempFileRef,
    });
  });

  it("cancels generation, resets to idle state, and clears the temporary file ref", async () => {
    const harness = createControllerHarness();
    harness.tempFileRef.current = "/tmp/diagram.mmd";

    await harness.controller.actions.cancelGeneration();

    expect(harness.services.cleanupTempFile).toHaveBeenCalledWith("/tmp/diagram.mmd");
    expect(harness.tempFileRef.current).toBeNull();
    expect(harness.services.notifyManualGenerationCancelled).toHaveBeenCalledTimes(1);
    expect(harness.getState()).toEqual({
      isLoading: false,
      error: null,
      browserSetup: null,
      imagePath: null,
      imageFormat: "svg",
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    });
  });

  it("prevents concurrent generation runs with an in-flight guard", async () => {
    const pendingInput = deferred<ResolvedMermaidInput>();
    const harness = createControllerHarness();
    harness.services.resolveSelectionInput.mockReturnValueOnce(pendingInput.promise);

    const firstRun = harness.controller.actions.runFromSelection();
    const secondRun = harness.controller.actions.runFromSelection();

    expect(harness.services.resolveSelectionInput).toHaveBeenCalledTimes(1);

    pendingInput.resolve(harness.selectionInput);
    await Promise.all([firstRun, secondRun]);
  });

  it("disposes active image and temp files", () => {
    const harness = createControllerHarness();
    harness.activeImagePathRef.current = "/tmp/diagram.svg";
    harness.tempFileRef.current = "/tmp/diagram.mmd";

    harness.controller.dispose();

    expect(harness.services.cleanupTempFile).toHaveBeenNthCalledWith(1, "/tmp/diagram.svg");
    expect(harness.services.cleanupTempFile).toHaveBeenNthCalledWith(2, "/tmp/diagram.mmd");
  });
});

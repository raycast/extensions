import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialManualCommandState, type ManualCommandState } from "../manual-command-state";
import type { ResolvedMermaidInput } from "../mermaid-input";

const { createManualCommandSession, createManualCommandGenerationRunner, createManualCommandBrowserDownloadFlow } =
  vi.hoisted(() => ({
    createManualCommandSession: vi.fn(),
    createManualCommandGenerationRunner: vi.fn(),
    createManualCommandBrowserDownloadFlow: vi.fn(),
  }));

vi.mock("../manual-command-session", () => ({
  createManualCommandSession,
}));

vi.mock("../manual-command-generation-runner", () => ({
  createManualCommandGenerationRunner,
}));

vi.mock("../manual-command-browser-download", () => ({
  createManualCommandBrowserDownloadFlow,
}));

import { createManualCommandController } from "../manual-command-controller";

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

describe("manual-command-controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createManualCommandSession.mockReset();
    createManualCommandGenerationRunner.mockReset();
    createManualCommandBrowserDownloadFlow.mockReset();
  });

  it("wires actions through the composed session, runner, and browser download flow", async () => {
    const stateHarness = createStateHarness();
    const tempFileRef = { current: "/tmp/diagram.mmd" as string | null };
    const activeImagePathRef = { current: "/tmp/diagram.svg" as string | null };
    const browserSetupInputRef = {
      current: { code: "graph TD\nA-->B", source: "selected" } as ResolvedMermaidInput | null,
    };
    const session = {
      clearTempFile: vi.fn(),
      finish: vi.fn(),
      clearPendingInput: vi.fn(),
      getPendingInput: vi.fn(() => browserSetupInputRef.current),
      dispose: vi.fn(),
    };
    const generationRunner = {
      run: vi.fn().mockResolvedValue(undefined),
      runResolvedInput: vi.fn().mockResolvedValue(undefined),
    };
    const browserDownloadFlow = {
      run: vi.fn().mockResolvedValue(undefined),
    };

    createManualCommandSession.mockReturnValue(session);
    createManualCommandGenerationRunner.mockReturnValue(generationRunner);
    createManualCommandBrowserDownloadFlow.mockReturnValue(browserDownloadFlow);

    const services = {
      resolveSelectionInput: vi.fn(),
      resolveClipboardOnlyInput: vi.fn(),
      runManualDiagramGeneration: vi.fn(),
      installManagedBrowser: vi.fn(),
      getManagedBrowserSupportRoot: vi.fn(),
      notifyManualGenerationStarted: vi.fn(),
      notifyManualGenerationSuccess: vi.fn(),
      notifyManualGenerationFailure: vi.fn(),
      notifyManagedBrowserDownloadStarted: vi.fn(),
      notifyManagedBrowserDownloadProgress: vi.fn(),
      notifyManagedBrowserDownloadSuccess: vi.fn(),
      notifyManagedBrowserDownloadFailure: vi.fn(),
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

    expect(createManualCommandSession).toHaveBeenCalledWith({
      tempFileRef,
      activeImagePathRef,
      browserSetupInputRef,
      cleanupTempFile: services.cleanupTempFile,
    });
    expect(createManualCommandGenerationRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: {
          outputFormat: "svg",
          renderEngine: "auto",
        },
        setState: stateHarness.setState,
        tempFileRef,
        session,
        services: expect.objectContaining({
          runManualDiagramGeneration: services.runManualDiagramGeneration,
        }),
      }),
    );
    expect(createManualCommandBrowserDownloadFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        session,
        environmentSupportPath: "/tmp/support",
        services: expect.objectContaining({
          installManagedBrowser: services.installManagedBrowser,
        }),
      }),
    );

    await controller.actions.runFromSelection();
    expect(generationRunner.run).toHaveBeenCalledWith(services.resolveSelectionInput);

    await controller.actions.runFromClipboardOnly();
    expect(generationRunner.run).toHaveBeenCalledWith(services.resolveClipboardOnlyInput);

    await controller.actions.retryBrowserSetup();
    expect(generationRunner.runResolvedInput).toHaveBeenCalledWith(browserSetupInputRef.current);

    await controller.actions.downloadManagedBrowserAndRetry();
    expect(browserDownloadFlow.run).toHaveBeenCalledTimes(1);

    await controller.actions.cancelGeneration();
    expect(session.clearTempFile).toHaveBeenCalledTimes(1);
    expect(session.finish).toHaveBeenCalledTimes(1);
    expect(services.notifyManualGenerationCancelled).toHaveBeenCalledTimes(1);
    expect(stateHarness.getState()).toEqual({
      isLoading: false,
      error: null,
      browserSetup: null,
      imagePath: null,
      imageFormat: "svg",
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    });

    controller.actions.cancelBrowserSetup();
    expect(session.clearPendingInput).toHaveBeenCalledTimes(1);

    controller.dispose();
    expect(session.dispose).toHaveBeenCalledTimes(1);
  });
});

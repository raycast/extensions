import { afterEach, describe, expect, it, vi } from "vitest";
import { createManualCommandGenerationRunner } from "../manual-command-generation-runner";
import { createInitialManualCommandState, type ManualCommandState } from "../manual-command-state";
import type { ManualGenerationState } from "../manual-command-service";
import type { ResolvedMermaidInput } from "../mermaid-input";

function createStateHarness(initialState = createInitialManualCommandState("svg")) {
  let currentState = initialState;

  const setState = vi.fn((update: ManualCommandState | ((previous: ManualCommandState) => ManualCommandState)) => {
    currentState = typeof update === "function" ? update(currentState) : update;
  });

  return {
    setState,
    getState: () => currentState,
  };
}

function createSessionStub(beginReturn = true) {
  return {
    begin: vi.fn(() => beginReturn),
    finish: vi.fn(),
    rememberInput: vi.fn(),
    getPendingInput: vi.fn(),
    clearPendingInput: vi.fn(),
    finalizeImagePath: vi.fn(),
    clearTempFile: vi.fn(),
    dispose: vi.fn(),
  };
}

function createRunnerHarness(overrides?: { sessionBegin?: boolean; generationResult?: ManualGenerationState }) {
  const stateHarness = createStateHarness();
  const tempFileRef = { current: null as string | null };
  const selectionInput = { code: "flowchart TD\nA --> B", source: "selected" } satisfies ResolvedMermaidInput;
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
  const session = createSessionStub(overrides?.sessionBegin ?? true);
  const services = {
    runManualDiagramGeneration: vi.fn().mockResolvedValue(generationResult),
    notifyManualGenerationStarted: vi.fn().mockResolvedValue(undefined),
    notifyManualGenerationSuccess: vi.fn().mockResolvedValue(undefined),
    notifyManualGenerationFailure: vi.fn().mockResolvedValue(undefined),
    logOperationalError: vi.fn(),
  };

  const runner = createManualCommandGenerationRunner({
    preferences: { outputFormat: "svg", renderEngine: "auto" },
    setState: stateHarness.setState,
    tempFileRef,
    session,
    services,
  });

  return {
    runner,
    session,
    services,
    tempFileRef,
    selectionInput,
    getState: stateHarness.getState,
  };
}

describe("manual-command-generation-runner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs input loading through generation and updates preview state on success", async () => {
    const harness = createRunnerHarness();

    await harness.runner.run(() => Promise.resolve(harness.selectionInput));

    expect(harness.session.begin).toHaveBeenCalledTimes(1);
    expect(harness.session.rememberInput).toHaveBeenCalledWith(harness.selectionInput);
    expect(harness.services.notifyManualGenerationStarted).toHaveBeenCalledWith("selected");
    expect(harness.services.runManualDiagramGeneration).toHaveBeenCalledWith(harness.selectionInput, {
      preferences: {
        outputFormat: "svg",
        renderEngine: "auto",
      },
      tempFileRef: harness.tempFileRef,
    });
    expect(harness.session.finalizeImagePath).toHaveBeenCalledWith({
      kind: "success",
      mermaidCode: harness.selectionInput.code,
      result: {
        outputPath: "/tmp/diagram.svg",
        format: "svg",
        engine: "beautiful",
        svgRasterStrategy: "macos",
      },
    });
    expect(harness.services.notifyManualGenerationSuccess).toHaveBeenCalledWith("selected", "beautiful");
    expect(harness.session.finish).toHaveBeenCalledTimes(1);
    expect(harness.getState()).toMatchObject({
      isLoading: false,
      imagePath: "/tmp/diagram.svg",
      engineUsed: "beautiful",
      mermaidCode: harness.selectionInput.code,
    });
  });

  it("keeps browser setup state while preserving the remembered input", async () => {
    const harness = createRunnerHarness({
      generationResult: {
        kind: "browser-setup",
        setup: {
          input: { code: "flowchart TD\nA --> B", source: "selected" },
          reason: "Need browser",
        },
      },
    });

    await harness.runner.runResolvedInput(harness.selectionInput);

    expect(harness.session.rememberInput).toHaveBeenCalledWith(harness.selectionInput);
    expect(harness.getState()).toMatchObject({
      isLoading: false,
      browserSetup: {
        input: { code: "flowchart TD\nA --> B", source: "selected" },
        reason: "Need browser",
      },
    });
  });

  it("maps fatal failures into fatal state and failure notifications", async () => {
    const harness = createRunnerHarness();
    harness.services.runManualDiagramGeneration.mockRejectedValueOnce(new Error("boom"));

    await harness.runner.runResolvedInput(harness.selectionInput);

    expect(harness.services.logOperationalError).toHaveBeenCalledWith(
      "process-mermaid-code-failed",
      expect.any(Error),
      {
        renderer: "auto",
      },
    );
    expect(harness.services.notifyManualGenerationFailure).toHaveBeenCalledWith(expect.any(Error), "boom");
    expect(harness.getState()).toMatchObject({
      isLoading: false,
      error: "boom",
      imagePath: null,
    });
  });

  it("maps input loader failures into fatal state and failure notifications", async () => {
    const harness = createRunnerHarness();

    await harness.runner.run(() => Promise.reject(new Error("selection failed")));

    expect(harness.services.logOperationalError).toHaveBeenCalledWith(
      "process-mermaid-code-failed",
      expect.any(Error),
      {
        renderer: "auto",
      },
    );
    expect(harness.services.notifyManualGenerationFailure).toHaveBeenCalledWith(expect.any(Error), "selection failed");
    expect(harness.getState()).toMatchObject({
      isLoading: false,
      error: "selection failed",
      imagePath: null,
    });
    expect(harness.session.finish).toHaveBeenCalledTimes(1);
  });

  it("does not re-enter when the session begin guard rejects the run", async () => {
    const harness = createRunnerHarness({ sessionBegin: false });

    await harness.runner.run(() => Promise.resolve(harness.selectionInput));

    expect(harness.services.runManualDiagramGeneration).not.toHaveBeenCalled();
    expect(harness.session.finish).not.toHaveBeenCalled();
  });
});

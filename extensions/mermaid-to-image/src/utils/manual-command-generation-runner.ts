import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  createFatalManualCommandState,
  createPendingManualCommandState,
  mapManualGenerationStateToCommandState,
  type ManualCommandState,
} from "./manual-command-state";
import type { ManualDiagramExecutionOptions, ManualGenerationState } from "./manual-command-service";
import type { ResolvedMermaidInput } from "./mermaid-input";
import type { ManualCommandSession } from "./manual-command-session";
import type { Preferences } from "../types";

export interface ManualCommandGenerationRunner {
  run: (
    inputLoader: () => Promise<ResolvedMermaidInput>,
    executionOptions?: Pick<ManualDiagramExecutionOptions, "skipBrowserCheck">,
  ) => Promise<void>;
  runResolvedInput: (
    resolvedInput: ResolvedMermaidInput,
    executionOptions?: Pick<ManualDiagramExecutionOptions, "skipBrowserCheck">,
  ) => Promise<void>;
}

interface ManualCommandGenerationRunnerServices {
  runManualDiagramGeneration: (
    resolvedInput: ResolvedMermaidInput,
    options: ManualDiagramExecutionOptions,
  ) => Promise<ManualGenerationState>;
  notifyManualGenerationStarted: (source: string) => Promise<void>;
  notifyManualGenerationSuccess: (source: string, engine: "beautiful" | "mmdc") => Promise<void>;
  notifyManualGenerationFailure: (error: unknown, message: string) => Promise<void>;
  logOperationalError: (event: string, error: unknown, metadata: Record<string, unknown>) => void;
}

interface CreateManualCommandGenerationRunnerOptions {
  preferences: Pick<Preferences, "outputFormat" | "renderEngine">;
  setState: Dispatch<SetStateAction<ManualCommandState>>;
  tempFileRef: MutableRefObject<string | null>;
  session: ManualCommandSession;
  services: ManualCommandGenerationRunnerServices;
}

export function createManualCommandGenerationRunner(
  options: CreateManualCommandGenerationRunnerOptions,
): ManualCommandGenerationRunner {
  const { preferences, setState, tempFileRef, session, services } = options;

  const handleFatalError = async (error: unknown) => {
    const userMessage = error instanceof Error ? error.message : "Failed to generate diagram. Please try again.";

    services.logOperationalError("process-mermaid-code-failed", error, {
      renderer: preferences.renderEngine,
    });

    setState((previousState) => createFatalManualCommandState(previousState, userMessage));
    await services.notifyManualGenerationFailure(error, userMessage);
  };

  const execute = async (
    loadInput: () => Promise<ResolvedMermaidInput>,
    executionOptions?: Pick<ManualDiagramExecutionOptions, "skipBrowserCheck">,
  ) => {
    if (!session.begin()) {
      return;
    }

    setState((previousState) => createPendingManualCommandState(previousState));

    try {
      const resolvedInput = await loadInput();
      session.rememberInput(resolvedInput);
      await services.notifyManualGenerationStarted(resolvedInput.source);

      const result = await services.runManualDiagramGeneration(resolvedInput, {
        preferences,
        tempFileRef,
        ...executionOptions,
      });

      session.finalizeImagePath(result);
      setState((previousState) => mapManualGenerationStateToCommandState(previousState, result));

      if (result.kind === "success") {
        await services.notifyManualGenerationSuccess(resolvedInput.source, result.result.engine);
      }

      if (result.kind === "error") {
        await services.notifyManualGenerationFailure(result.error, result.message);
      }
    } catch (error) {
      await handleFatalError(error);
    } finally {
      session.finish();
    }
  };

  return {
    run: async (inputLoader, executionOptions) => {
      await execute(inputLoader, executionOptions);
    },
    runResolvedInput: async (resolvedInput, executionOptions) => {
      await execute(() => Promise.resolve(resolvedInput), executionOptions);
    },
  };
}

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ResolvedMermaidInput } from "./mermaid-input";
import type { DiagramFormat, ResolvedEngine } from "../renderers/types";
import {
  createFatalManualCommandState,
  createIdleManualCommandState,
  createPendingManualCommandState,
  mapManualGenerationStateToCommandState,
  type ManualCommandState,
} from "./manual-command-state";
import type { ManualDiagramExecutionOptions, ManualGenerationState } from "./manual-command-service";
import { formatByteSize } from "./byte-size";
import type { Preferences } from "../types";

export interface ManualCommandControllerActions {
  runFromSelection: () => Promise<void>;
  runFromClipboardOnly: () => Promise<void>;
  retryBrowserSetup: () => Promise<void>;
  downloadManagedBrowserAndRetry: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
  cancelBrowserSetup: () => void;
}

interface ManualCommandControllerServices {
  resolveSelectionInput: () => Promise<ResolvedMermaidInput>;
  resolveClipboardOnlyInput: () => Promise<ResolvedMermaidInput>;
  runManualDiagramGeneration: (
    resolvedInput: ResolvedMermaidInput,
    options: ManualDiagramExecutionOptions,
  ) => Promise<ManualGenerationState>;
  installManagedBrowser: (options: {
    onProgress?: (downloadedBytes: number, totalBytes: number) => void;
  }) => Promise<{ source: string }>;
  getManagedBrowserSupportRoot: (supportPath: string) => string;
  notifyManualGenerationStarted: (source: string) => Promise<void>;
  notifyManualGenerationSuccess: (source: string, engine: ResolvedEngine) => Promise<void>;
  notifyManualGenerationFailure: (error: unknown, message: string) => Promise<void>;
  notifyManagedBrowserDownloadStarted: () => Promise<unknown>;
  notifyManagedBrowserDownloadProgress: (toast: unknown, message: string) => void;
  notifyManagedBrowserDownloadSuccess: (toast: unknown, source: string, supportRoot: string) => void;
  notifyManagedBrowserDownloadFailure: (error: unknown) => Promise<void>;
  notifyManualGenerationCancelled: () => Promise<void>;
  cleanupTempFile: (path: string | null) => void;
  logOperationalError: (event: string, error: unknown, metadata: Record<string, unknown>) => void;
}

interface CreateManualCommandControllerOptions {
  preferences: Pick<Preferences, "outputFormat" | "renderEngine">;
  defaultFormat: DiagramFormat;
  setState: Dispatch<SetStateAction<ManualCommandState>>;
  tempFileRef: MutableRefObject<string | null>;
  activeImagePathRef: MutableRefObject<string | null>;
  browserSetupInputRef: MutableRefObject<ResolvedMermaidInput | null>;
  environmentSupportPath: string;
  services: ManualCommandControllerServices;
}

interface ManualCommandController {
  actions: ManualCommandControllerActions;
  dispose: () => void;
}

function createSession(options: {
  tempFileRef: MutableRefObject<string | null>;
  activeImagePathRef: MutableRefObject<string | null>;
  browserSetupInputRef: MutableRefObject<ResolvedMermaidInput | null>;
  cleanupTempFile: (path: string | null) => void;
}) {
  let isProcessing = false;

  return {
    begin(): boolean {
      if (isProcessing) {
        return false;
      }

      isProcessing = true;
      options.browserSetupInputRef.current = null;
      return true;
    },
    finish() {
      isProcessing = false;
    },
    rememberInput(input: ResolvedMermaidInput) {
      options.browserSetupInputRef.current = input;
    },
    getPendingInput() {
      return options.browserSetupInputRef.current;
    },
    clearPendingInput() {
      options.browserSetupInputRef.current = null;
    },
    finalizeImagePath(result: ManualGenerationState) {
      if (result.kind !== "success") {
        return;
      }

      const nextImagePath = result.result.outputPath;
      if (options.activeImagePathRef.current && options.activeImagePathRef.current !== nextImagePath) {
        options.cleanupTempFile(options.activeImagePathRef.current);
      }
      options.activeImagePathRef.current = nextImagePath;
    },
    clearTempFile() {
      options.cleanupTempFile(options.tempFileRef.current);
      options.tempFileRef.current = null;
    },
    dispose() {
      options.cleanupTempFile(options.activeImagePathRef.current);
      options.cleanupTempFile(options.tempFileRef.current);
    },
  };
}

export function createManualCommandController(options: CreateManualCommandControllerOptions): ManualCommandController {
  const { preferences, defaultFormat, setState, tempFileRef, environmentSupportPath, services } = options;
  const session = createSession({
    tempFileRef,
    activeImagePathRef: options.activeImagePathRef,
    browserSetupInputRef: options.browserSetupInputRef,
    cleanupTempFile: services.cleanupTempFile,
  });

  const runGeneration = async (
    inputLoader: () => Promise<ResolvedMermaidInput>,
    executionOptions?: Pick<ManualDiagramExecutionOptions, "skipBrowserCheck">,
  ) => {
    if (!session.begin()) {
      return;
    }

    setState((previousState) => createPendingManualCommandState(previousState));

    try {
      const resolvedInput = await inputLoader();
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
      const userMessage = error instanceof Error ? error.message : "Failed to generate diagram. Please try again.";

      services.logOperationalError("process-mermaid-code-failed", error, {
        renderer: preferences.renderEngine,
      });

      setState((previousState) => createFatalManualCommandState(previousState, userMessage));
      await services.notifyManualGenerationFailure(error, userMessage);
    } finally {
      session.finish();
    }
  };

  return {
    actions: {
      runFromSelection: async () => {
        await runGeneration(services.resolveSelectionInput);
      },
      runFromClipboardOnly: async () => {
        await runGeneration(services.resolveClipboardOnlyInput);
      },
      retryBrowserSetup: async () => {
        const pendingInput = session.getPendingInput();
        if (!pendingInput) {
          return;
        }

        await runGeneration(() => Promise.resolve(pendingInput));
      },
      downloadManagedBrowserAndRetry: async () => {
        const pendingInput = session.getPendingInput();
        if (!pendingInput) {
          return;
        }

        try {
          const toast = await services.notifyManagedBrowserDownloadStarted();
          const installResult = await services.installManagedBrowser({
            onProgress: (downloadedBytes, totalBytes) => {
              services.notifyManagedBrowserDownloadProgress(
                toast,
                `${formatByteSize(downloadedBytes)} / ${formatByteSize(totalBytes)}`,
              );
            },
          });

          services.notifyManagedBrowserDownloadSuccess(
            toast,
            installResult.source,
            services.getManagedBrowserSupportRoot(environmentSupportPath),
          );

          await runGeneration(() => Promise.resolve(pendingInput));
        } catch (error) {
          services.logOperationalError("download-managed-browser-failed", error, { source: "managed" });
          await services.notifyManagedBrowserDownloadFailure(error);
        }
      },
      cancelGeneration: async () => {
        session.clearTempFile();
        session.finish();
        setState(createIdleManualCommandState(defaultFormat ?? "svg"));
        await services.notifyManualGenerationCancelled();
      },
      cancelBrowserSetup: () => {
        session.clearPendingInput();
        setState(createIdleManualCommandState(defaultFormat ?? "svg"));
      },
    },
    dispose: () => {
      session.dispose();
    },
  };
}

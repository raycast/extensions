import type { Toast } from "@raycast/api";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ResolvedMermaidInput } from "./mermaid-input";
import type { DiagramFormat, ResolvedEngine } from "../renderers/types";
import { createIdleManualCommandState, type ManualCommandState } from "./manual-command-state";
import type { ManualDiagramExecutionOptions, ManualGenerationState } from "./manual-command-service";
import type { Preferences } from "../types";
import { createManualCommandSession } from "./manual-command-session";
import { createManualCommandGenerationRunner } from "./manual-command-generation-runner";
import { createManualCommandBrowserDownloadFlow } from "./manual-command-browser-download";

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
  notifyManagedBrowserDownloadStarted: () => Promise<Toast>;
  notifyManagedBrowserDownloadProgress: (toast: Toast, message: string) => void;
  notifyManagedBrowserDownloadSuccess: (toast: Toast, source: string, supportRoot: string) => void;
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

export function createManualCommandController(options: CreateManualCommandControllerOptions): ManualCommandController {
  const { preferences, defaultFormat, setState, tempFileRef, environmentSupportPath, services } = options;
  const session = createManualCommandSession({
    tempFileRef,
    activeImagePathRef: options.activeImagePathRef,
    browserSetupInputRef: options.browserSetupInputRef,
    cleanupTempFile: services.cleanupTempFile,
  });
  const generationRunner = createManualCommandGenerationRunner({
    preferences,
    setState,
    tempFileRef,
    session,
    services: {
      runManualDiagramGeneration: services.runManualDiagramGeneration,
      notifyManualGenerationStarted: services.notifyManualGenerationStarted,
      notifyManualGenerationSuccess: services.notifyManualGenerationSuccess,
      notifyManualGenerationFailure: services.notifyManualGenerationFailure,
      logOperationalError: services.logOperationalError,
    },
  });
  const browserDownloadFlow = createManualCommandBrowserDownloadFlow({
    session,
    environmentSupportPath,
    services: {
      installManagedBrowser: services.installManagedBrowser,
      getManagedBrowserSupportRoot: services.getManagedBrowserSupportRoot,
      notifyManagedBrowserDownloadStarted: services.notifyManagedBrowserDownloadStarted,
      notifyManagedBrowserDownloadProgress: services.notifyManagedBrowserDownloadProgress,
      notifyManagedBrowserDownloadSuccess: services.notifyManagedBrowserDownloadSuccess,
      notifyManagedBrowserDownloadFailure: services.notifyManagedBrowserDownloadFailure,
      logOperationalError: services.logOperationalError,
      runResolvedInput: generationRunner.runResolvedInput,
    },
  });

  return {
    actions: {
      runFromSelection: async () => {
        await generationRunner.run(services.resolveSelectionInput);
      },
      runFromClipboardOnly: async () => {
        await generationRunner.run(services.resolveClipboardOnlyInput);
      },
      retryBrowserSetup: async () => {
        const pendingInput = session.getPendingInput();
        if (!pendingInput) {
          return;
        }

        await generationRunner.runResolvedInput(pendingInput);
      },
      downloadManagedBrowserAndRetry: async () => {
        await browserDownloadFlow.run();
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

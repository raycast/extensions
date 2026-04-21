import { useEffect, useRef, useState } from "react";
import { Clipboard, environment, getSelectedText, type Toast } from "@raycast/api";

import { type DiagramFormat } from "../renderers/types";
import { cleanupOldTempFiles, cleanupTempFile } from "../utils/files";
import { logOperationalError } from "../utils/logger";
import {
  notifyManagedBrowserDownloadFailure,
  notifyManagedBrowserDownloadProgress,
  notifyManagedBrowserDownloadStarted,
  notifyManagedBrowserDownloadSuccess,
  notifyManualGenerationCancelled,
  notifyManualGenerationFailure,
  notifyManualGenerationStarted,
  notifyManualGenerationSuccess,
} from "../utils/manual-command-notifications";
import { createInitialManualCommandState, type ManualCommandState } from "../utils/manual-command-state";
import { getManagedBrowserSupportRoot, installManagedBrowser } from "../utils/browser-manager";
import { resolveClipboardOnlyManualInput, resolveManualInput } from "../utils/manual-input-service";
import { type ResolvedMermaidInput } from "../utils/mermaid-input";
import { runManualDiagramGeneration } from "../utils/manual-command-service";
import { createManualCommandController } from "../utils/manual-command-controller";
import { Preferences } from "../types";

export interface ManualMermaidCommandActions {
  runFromSelection: () => Promise<void>;
  runFromClipboardOnly: () => Promise<void>;
  retryBrowserSetup: () => Promise<void>;
  downloadManagedBrowserAndRetry: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
  cancelBrowserSetup: () => void;
}

interface UseManualMermaidCommandReturn {
  state: ManualCommandState;
  actions: ManualMermaidCommandActions;
}

function getDefaultFormat(preferences: Pick<Preferences, "outputFormat">): DiagramFormat {
  return preferences.outputFormat ?? "svg";
}

async function readClipboardText(): Promise<string | null> {
  return (await Clipboard.readText()) ?? null;
}

export function useManualMermaidCommand(preferences: Preferences): UseManualMermaidCommandReturn {
  const defaultFormat = getDefaultFormat(preferences);
  const [state, setState] = useState<ManualCommandState>(() => createInitialManualCommandState(defaultFormat));
  const tempFileRef = useRef<string | null>(null);
  const activeImagePathRef = useRef<string | null>(null);
  const browserSetupInputRef = useRef<ResolvedMermaidInput | null>(null);
  const controllerRef = useRef<ReturnType<typeof createManualCommandController> | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createManualCommandController({
      preferences,
      defaultFormat,
      setState,
      tempFileRef,
      activeImagePathRef,
      browserSetupInputRef,
      environmentSupportPath: environment.supportPath,
      services: {
        resolveSelectionInput: () =>
          resolveManualInput({
            getSelectedText,
            getClipboardText: readClipboardText,
          }),
        resolveClipboardOnlyInput: () =>
          resolveClipboardOnlyManualInput({
            getClipboardText: readClipboardText,
          }),
        runManualDiagramGeneration,
        installManagedBrowser,
        getManagedBrowserSupportRoot,
        notifyManualGenerationStarted,
        notifyManualGenerationSuccess,
        notifyManualGenerationFailure,
        notifyManagedBrowserDownloadStarted,
        notifyManagedBrowserDownloadProgress: (toast: Toast, message: string) =>
          notifyManagedBrowserDownloadProgress(toast, message),
        notifyManagedBrowserDownloadSuccess: (toast: Toast, source: string, supportRoot: string) =>
          notifyManagedBrowserDownloadSuccess(toast, source, supportRoot),
        notifyManagedBrowserDownloadFailure,
        notifyManualGenerationCancelled,
        cleanupTempFile,
        logOperationalError,
      },
    });
  }

  const controller = controllerRef.current;

  useEffect(() => {
    cleanupOldTempFiles();
    void controller.actions.runFromSelection();

    return () => {
      controller.dispose();
    };
  }, [controller]);

  return {
    state,
    actions: controller.actions,
  };
}

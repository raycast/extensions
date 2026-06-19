import type { MutableRefObject } from "react";
import type { ResolvedMermaidInput } from "./mermaid-input";
import type { ManualGenerationState } from "./manual-command-service";

export interface ManualCommandSession {
  begin: () => boolean;
  finish: () => void;
  rememberInput: (input: ResolvedMermaidInput) => void;
  getPendingInput: () => ResolvedMermaidInput | null;
  clearPendingInput: () => void;
  finalizeImagePath: (result: ManualGenerationState) => void;
  clearTempFile: () => void;
  dispose: () => void;
}

interface CreateManualCommandSessionOptions {
  tempFileRef: MutableRefObject<string | null>;
  activeImagePathRef: MutableRefObject<string | null>;
  browserSetupInputRef: MutableRefObject<ResolvedMermaidInput | null>;
  cleanupTempFile: (path: string | null) => void;
}

export function createManualCommandSession(options: CreateManualCommandSessionOptions): ManualCommandSession {
  let isProcessing = false;

  return {
    begin() {
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
    rememberInput(input) {
      options.browserSetupInputRef.current = input;
    },
    getPendingInput() {
      return options.browserSetupInputRef.current;
    },
    clearPendingInput() {
      options.browserSetupInputRef.current = null;
    },
    finalizeImagePath(result) {
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

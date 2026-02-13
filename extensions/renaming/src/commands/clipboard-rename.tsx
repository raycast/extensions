/**
 * Clipboard Rename Command
 *
 * Opens the rename form with the "New Name" pre-populated from clipboard.
 * This is a shortcut to the regular rename flow.
 */

import { useEffect, useState } from "react";
import { Clipboard } from "@raycast/api";
import { useRenameForm } from "../hooks/use-rename-form";
import { parseClipboard } from "../lib/clipboard";
import { log } from "../lib/logger";
import { FileSelectionForm } from "../components/file-selection-form";
import { ResultsView } from "../components/results-view";
import { RenameFormView } from "../components/rename-form-view";
import { SelectionMode } from "../types";

export default function ClipboardRenameCommand({ mode = SelectionMode.FILES }: { mode?: SelectionMode }) {
  const [clipboardLoaded, setClipboardLoaded] = useState(false);
  const form = useRenameForm({ mode, extraIsLoading: !clipboardLoaded });

  useEffect(() => {
    async function loadClipboard() {
      try {
        const text = await Clipboard.readText();
        if (text) {
          const parsed = parseClipboard(text);
          if (parsed.names.length > 0) {
            const name = parsed.names[0]!.replace(/\.[^.]+$/, "");
            form.setNewName(name);
          }
        }
      } catch (error) {
        log.rename.error("Failed to read clipboard", error);
      } finally {
        setClipboardLoaded(true);
      }
    }
    loadClipboard();
  }, []);

  if (form.noFilesSelected && form.files.length === 0) {
    return <FileSelectionForm onFilesSelected={form.setFiles} mode={mode} />;
  }

  if (form.operationResults) {
    const hasFailures = form.operationResults.some((r) => !r.success);
    return (
      <ResultsView
        results={form.operationResults}
        onClose={form.handleClose}
        onUndo={form.handleUndo}
        onRetryFailed={hasFailures ? form.handleRetryFailed : undefined}
        isLoading={form.isProcessing}
      />
    );
  }

  return <RenameFormView form={form} mode={mode} newNameInfo="New filename (from clipboard)" />;
}

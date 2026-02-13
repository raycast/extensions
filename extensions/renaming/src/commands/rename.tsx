import { useRenameForm } from "../hooks/use-rename-form";
import { FileSelectionForm } from "../components/file-selection-form";
import { ResultsView } from "../components/results-view";
import { RenameFormView } from "../components/rename-form-view";
import { SelectionMode } from "../types";

export default function RenameCommand({ mode = SelectionMode.FILES }: { mode?: SelectionMode }) {
  const form = useRenameForm({ mode });

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

  return <RenameFormView form={form} mode={mode} />;
}

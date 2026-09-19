import type { ImportReplacementError } from "../portability/replace-backup";
import type { BackupCounts, ImportPreview } from "../portability/import-preview";

export type FailurePresentation = {
  title: string;
  message: string;
  recoveryPath?: string;
};

function countRows(counts: BackupCounts): Array<[string, number]> {
  return [
    ["Projects", counts.projects],
    ["Labels", counts.labels],
    ["Tasks", counts.tasks],
    ["Incomplete", counts.lifecycle.activeIncomplete],
    ["Completed", counts.lifecycle.activeCompleted],
    ["Incomplete in trash", counts.lifecycle.trashedIncomplete],
    ["Completed in trash", counts.lifecycle.trashedCompleted],
  ];
}

export function importPreviewMarkdown(preview: ImportPreview): string {
  const rows = countRows(preview.current).map(([label, current], index) => {
    const incoming = countRows(preview.incoming)[index][1];
    return `| ${label} | ${current} | ${incoming} |`;
  });
  return [
    "# Replace Worktodo data",
    "",
    preview.warning,
    "",
    `Backup version: ${preview.formatVersion}`,
    `Exported: ${formatExportedAt(preview.exportedAtMs)}`,
    "",
    "| Data | Current | Incoming |",
    "| --- | ---: | ---: |",
    ...rows,
  ].join("\n");
}

function formatExportedAt(exportedAtMs: number): string {
  const date = new Date(exportedAtMs);
  return Number.isNaN(date.getTime()) ? `${exportedAtMs} ms since Unix epoch` : date.toISOString();
}

export function exportSuccessMarkdown(path: string): string {
  return `# Backup exported\n\nWorktodo created a complete JSON backup at:\n\n${path}`;
}

export function importSuccessMarkdown(recoveryPath: string): string {
  return `# Backup restored\n\nThe selected backup is now active. The previous data remains available at:\n\n${recoveryPath}`;
}

export function failurePresentation(error: unknown, operation: "export" | "import"): FailurePresentation {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  const unchanged = message.includes("Worktodo data was not changed")
    ? message
    : `${message}${/[.!?]$/.test(message) ? " " : ". "}Worktodo data was not changed.`;
  const recoveryPath =
    error instanceof Error && "recoveryPath" in error ? (error as ImportReplacementError).recoveryPath : undefined;
  return {
    title: operation === "export" ? "Backup export failed" : "Backup restore failed",
    message: unchanged,
    ...(recoveryPath ? { recoveryPath } : {}),
  };
}

import type { ProcessedJiraKanbanBoardIssue, JiraBoardConfiguration } from "@/types";

export function groupSprintIssuesByColumn(
  processedIssues: ProcessedJiraKanbanBoardIssue[],
  boardConfiguration: JiraBoardConfiguration,
): Record<string, ProcessedJiraKanbanBoardIssue[]> {
  const grouped: Record<string, ProcessedJiraKanbanBoardIssue[]> = {};
  const columns = boardConfiguration.columnConfig.columns;

  columns.forEach((column) => {
    grouped[column.name] = [];
  });

  // Initialize Unmapped Statuses column
  grouped["Unmapped"] = [];

  // Group processed issues by their status
  processedIssues.forEach((processedIssue) => {
    const statusId = processedIssue.statusId;

    if (!statusId) {
      grouped["Unmapped"].push(processedIssue);
      return;
    }

    // Find which column this status belongs to
    const column = columns.find((col) => col.statuses.some((status) => status.id === statusId));

    if (column) {
      grouped[column.name].push(processedIssue);
    } else {
      // If status is not mapped to any column, add to Unmapped
      grouped["Unmapped"].push(processedIssue);
    }
  });

  return grouped;
}

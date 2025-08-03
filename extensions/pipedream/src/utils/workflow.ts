import { SavedWorkflow } from "../types";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Gets existing folders from workflows
 */
export function getExistingFolders(workflows: SavedWorkflow[]): string[] {
  const folders = new Set<string>();
  workflows.forEach((workflow) => {
    if (workflow.folder) {
      folders.add(workflow.folder);
    }
  });
  return Array.from(folders).sort();
}

/**
 * Groups workflows by folder
 */
export function groupWorkflowsByFolder<T extends { folder?: string; customName: string }>(
  workflows: T[],
): Record<string, T[]> {
  const groups = workflows.reduce<Record<string, T[]>>((acc, wf) => {
    const folder = wf.folder ?? "";
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(wf);
    return acc;
  }, {});

  Object.keys(groups).forEach((key) => {
    if (groups[key]) {
      groups[key]!.sort((a, b) => collator.compare(a.customName, b.customName));
    }
  });

  return groups;
}

/**
 * Formats workflow data for display
 */
export function formatWorkflowData(workflow: SavedWorkflow) {
  return {
    id: workflow.id,
    name: workflow.customName,
    url: workflow.url,
    triggerCount: workflow.triggerCount,
    stepCount: workflow.stepCount,
    showInMenuBar: workflow.showInMenuBar,
    sortOrder: workflow.sortOrder,
  };
}

/**
 * Sorts workflows by the specified criteria
 */
export function sortWorkflows(
  workflows: SavedWorkflow[],
  sortBy: "name" | "errors" | "triggers" | "steps",
  sortOrder: "asc" | "desc",
  errorCounts: Record<string, number>,
) {
  return [...workflows].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.customName.localeCompare(b.customName);
        break;
      case "errors":
        comparison = (errorCounts[b.id] ?? 0) - (errorCounts[a.id] ?? 0);
        break;
      case "triggers":
        comparison = b.triggerCount - a.triggerCount;
        break;
      case "steps":
        comparison = b.stepCount - a.stepCount;
        break;
      default: {
        const _exhaustiveCheck: never = sortBy;
        throw new Error(`Unhandled sort option: ${_exhaustiveCheck}`);
      }
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });
}

/**
 * Filters workflows based on criteria
 */
export function filterWorkflows(
  workflows: SavedWorkflow[],
  filterBy: "all" | "menuBar" | "notMenuBar" | "errors",
  errorCounts: Record<string, number>,
) {
  switch (filterBy) {
    case "menuBar":
      return workflows.filter((w) => w.showInMenuBar);
    case "notMenuBar":
      return workflows.filter((w) => !w.showInMenuBar);
    case "errors":
      return workflows.filter((w) => (errorCounts[w.id] ?? 0) > 0);
    case "all":
      return workflows;
    default: {
      const _exhaustiveCheck: never = filterBy;
      throw new Error(`Unhandled filter option: ${_exhaustiveCheck}`);
    }
  }
}

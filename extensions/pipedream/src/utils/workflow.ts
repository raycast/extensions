import { SavedWorkflow } from "../types";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Gets existing folders from workflows
 */
export function getExistingFolders(workflows: SavedWorkflow[]): string[] {
  const folders = new Set<string>();
  workflows.forEach(workflow => {
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
  workflows: T[]
): Record<string, T[]> {
  const groups = workflows.reduce<Record<string, T[]>>((acc, wf) => {
    const folder = wf.folder ?? "";
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(wf);
    return acc;
  }, {});

  Object.keys(groups).forEach(key => {
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
export function sortWorkflows(workflows: SavedWorkflow[], sortBy: "name" | "errors" | "triggers" | "steps") {
  return [...workflows].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.customName.localeCompare(b.customName);
      case "errors":
        // For now, we'll sort by name since we don't have error counts in the workflow data
        return a.customName.localeCompare(b.customName);
      case "triggers":
        return b.triggerCount - a.triggerCount;
      case "steps":
        return b.stepCount - a.stepCount;
      default: {
        const _exhaustiveCheck: never = sortBy;
        throw new Error(`Unhandled sort option: ${_exhaustiveCheck}`);
      }
    }
  });
}

/**
 * Filters workflows based on criteria
 */
export function filterWorkflows(workflows: SavedWorkflow[], filterBy: "all" | "menuBar" | "notMenuBar" | "errors") {
  switch (filterBy) {
    case "menuBar":
      return workflows.filter(w => w.showInMenuBar);
    case "notMenuBar":
      return workflows.filter(w => !w.showInMenuBar);
    case "errors":
      // For now, return all workflows since we don't have error data in the workflow list
      return workflows;
    case "all":
      return workflows;
    default: {
      const _exhaustiveCheck: never = filterBy;
      throw new Error(`Unhandled filter option: ${_exhaustiveCheck}`);
    }
  }
}

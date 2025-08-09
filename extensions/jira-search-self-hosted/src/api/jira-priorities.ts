import { showToast, Toast } from "@raycast/api";
import { jiraFetchObject } from "../jira";
import { Priority } from "../types/jira-types";

// In-memory cache for priorities
const priorityCache: {
  global: Priority[];
  byProject: Record<string, Priority[]>;
} = {
  global: [],
  byProject: {},
};

/**
 * Loads priorities for the specified project and issue type
 * Uses multiple methods with gradual fallback to backup options
 * @param projectKey Project key
 * @param issueTypeId Issue type ID (optional)
 * @param setPriorities Function to set priorities in component state
 * @returns Array of priorities
 */
export async function loadPrioritiesForProject(
  projectKey: string,
  issueTypeId?: string,
  setPriorities?: (priorities: Priority[]) => void,
): Promise<Priority[]> {
  try {
    // First check in-memory cache
    if (priorityCache.byProject[projectKey] && priorityCache.byProject[projectKey].length > 0) {
      const cachedPriorities = priorityCache.byProject[projectKey];
      if (setPriorities) setPriorities(cachedPriorities);
      return cachedPriorities;
    }

    // Load global priorities only once
    if (priorityCache.global.length === 0) {
      try {
        priorityCache.global = await jiraFetchObject<Priority[]>("/rest/api/2/priority");
      } catch (e) {
        console.error("Failed to load global priorities:", e);
        priorityCache.global = [];
      }
    }

    // Set global priorities immediately to show something while loading
    if (setPriorities && priorityCache.global.length > 0) {
      setPriorities(priorityCache.global);
    }

    try {
      // Method 1: Get priority scheme and map IDs to priority objects
      try {
        const schemeResponse = await jiraFetchObject<Record<string, unknown>>(
          `/rest/api/2/project/${projectKey}/priorityscheme`,
        );

        if (schemeResponse && "optionIds" in schemeResponse && Array.isArray(schemeResponse.optionIds)) {
          const priorityIds = schemeResponse.optionIds as string[];

          const projectPriorities = priorityIds
            .map((id) => priorityCache.global.find((p) => p.id === id))
            .filter((p): p is Priority => p !== undefined);

          if (projectPriorities.length > 0) {
            priorityCache.byProject[projectKey] = projectPriorities;

            if (setPriorities) setPriorities(projectPriorities);
            return projectPriorities;
          }
        }
      } catch (error) {
        // Silently proceed to next method
      }

      // Method 2: Try project API
      try {
        const projectResponse = await jiraFetchObject<Record<string, unknown>>(`/rest/api/2/project/${projectKey}`);

        if (projectResponse && "issueTypes" in projectResponse && Array.isArray(projectResponse.issueTypes)) {
          const issueTypes = projectResponse.issueTypes as Record<string, unknown>[];
          const issueType = issueTypeId ? issueTypes.find((it) => it.id === issueTypeId) : issueTypes[0];

          if (issueType && "priorities" in issueType && Array.isArray(issueType.priorities)) {
            const priorities = issueType.priorities as Priority[];

            priorityCache.byProject[projectKey] = priorities;

            if (setPriorities) setPriorities(priorities);
            return priorities;
          }
        }
      } catch (error) {
        // Silently proceed to fallback
      }

      // Fallback to global priorities
      if (setPriorities) setPriorities(priorityCache.global);
      return priorityCache.global;
    } catch (e) {
      if (setPriorities) setPriorities(priorityCache.global);
      return priorityCache.global;
    }
  } catch (error) {
    console.error("Failed to load priorities:", error);
    showToast({ style: Toast.Style.Failure, title: "Could not load priorities" });

    if (setPriorities && priorityCache.global.length > 0) {
      setPriorities(priorityCache.global);
    }
    return priorityCache.global;
  }
}

/**
 * Resets priority cache for a specific project or all projects
 * @param projectKey Project key (optional)
 */
export function resetPriorityCache(projectKey?: string): void {
  if (projectKey) {
    delete priorityCache.byProject[projectKey];
  } else {
    priorityCache.byProject = {};
  }
}

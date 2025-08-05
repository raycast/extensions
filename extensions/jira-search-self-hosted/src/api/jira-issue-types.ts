import { jiraFetchObject } from "../jira";
import { IssueType } from "../types/jira-types";

/**
 * Loads issue types for the specified project
 * @param projectId Project ID
 * @returns Array of issue types with icons
 */
export async function loadIssueTypes(projectId: string): Promise<IssueType[]> {
  try {
    const result = await jiraFetchObject<{ issueTypes: IssueType[] }>(`/rest/api/2/project/${projectId}`);
    // Load issue types with icons
    return result.issueTypes || [];
  } catch (error) {
    console.error("Failed to load issue types:", error);
    return [];
  }
}

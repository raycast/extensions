import { LocalStorage } from "@raycast/api";

// Storage keys
const LAST_REPOSITORY_KEY = "LAST_REPOSITORY";
const LAST_ASSIGNEE_KEY = "LAST_ASSIGNEE";
const LAST_PROJECT_KEY = "LAST_PROJECT";

/**
 * Save the last used repository ID
 * @param repositoryId Repository ID
 */
export async function setLastRepository(repositoryId: string) {
  await LocalStorage.setItem(LAST_REPOSITORY_KEY, repositoryId);
}

/**
 * Get the last used repository ID
 * @returns Repository ID
 */
export async function getLastRepository() {
  return await LocalStorage.getItem<string>(LAST_REPOSITORY_KEY);
}

/**
 * Save the last used assignee ID
 * @param assigneeId Assignee ID
 */
export async function setLastAssignees(assigneeIds: string[]) {
  await LocalStorage.setItem(LAST_ASSIGNEE_KEY, JSON.stringify(assigneeIds));
}

/**
 * Get the last used assignee IDs
 * @returns Array of assignee IDs
 */
export async function getLastAssignees(): Promise<string[]> {
  const data = await LocalStorage.getItem<string>(LAST_ASSIGNEE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Save the last used project IDs
 * @param projectIds Array of project IDs
 */
export async function setLastProjects(projectIds: string[]) {
  await LocalStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(projectIds));
}

/**
 * Get the last used project IDs
 * @returns Array of project IDs
 */
export async function getLastProjects(): Promise<string[]> {
  const data = await LocalStorage.getItem<string>(LAST_PROJECT_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

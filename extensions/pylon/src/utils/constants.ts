/**
 * Pylon application base URL
 */
export const PYLON_BASE_URL = "https://app.usepylon.com";

/**
 * Build a Pylon task URL
 */
export function getTaskUrl(taskId: string): string {
  return `${PYLON_BASE_URL}/tasks/${taskId}`;
}

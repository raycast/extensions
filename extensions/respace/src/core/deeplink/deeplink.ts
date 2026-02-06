/**
 * Utility functions for creating Raycast deeplinks
 */

const EXTENSION_AUTHOR = "royal-lobster";
const EXTENSION_NAME = "respace";

/**
 * Creates a deeplink URL for the quick-open command with a workspace name
 */
export function getWorkspaceDeeplink(workspaceName: string): string {
  const args = JSON.stringify({ workspaceName });
  return `raycast://extensions/${EXTENSION_AUTHOR}/${EXTENSION_NAME}/quick-open?arguments=${encodeURIComponent(args)}`;
}

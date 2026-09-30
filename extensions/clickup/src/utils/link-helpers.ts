/** Build route to a ClickUp space */
export function buildSpaceRoute(teamId: string, spaceId: string): string {
  return `${teamId}/v/o/s/${spaceId}`;
}

/** Build route to a ClickUp folder */
export function buildFolderRoute(teamId: string, folderId: string): string {
  return `${teamId}/v/o/f/${folderId}`;
}

/** Build route to a ClickUp list */
export function buildListRoute(teamId: string, listId: string): string {
  return `${teamId}/v/li/${listId}`;
}

/** Build route to a ClickUp doc */
export function buildDocRoute(workspaceId: string, docId: string): string {
  return `${workspaceId}/v/dc/${docId}`;
}

/** Build route to a ClickUp doc page */
export function buildDocPageRoute(workspaceId: string, docId: string, pageId: string): string {
  return `${workspaceId}/v/dc/${docId}/${pageId}`;
}

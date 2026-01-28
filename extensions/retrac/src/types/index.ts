export type WorkspaceId = {
  workspaceId: string;
};
/**
 * The deleted link
 */
export type DeleteItemResponseBody = {
  /**
   * The ID of the item.
   */
  id: string;
};

export * from "./tag-schema";
export * from "./item-schema";
export * from "./workspace-schema";

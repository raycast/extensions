export type WorkspaceId = {
  workspaceId: string;
};

/**
 * These types have been copied over from official dub SDK: https://d.to/sdk
 */

/**
 * The deleted link
 */
export type DeleteLinkResponseBody = {
  /**
   * The ID of the link.
   */
  id: string;
};

export * from "./tag-schema";
export * from "./link-schema";
export * from "./workspace-schema";

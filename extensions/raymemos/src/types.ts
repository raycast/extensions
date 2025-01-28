/**
 * Types and interfaces for the Raymemos extension
 */

/**
 * Enum representing the possible status values of a memo
 */
export enum ROW_STATUS {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

/**
 * Interface representing a resource (attachment) in a memo
 */
export interface Resource {
  name: string;
  uid: string;
  createTime: string;
  filename: string;
  content: string;
  externalLink: string;
  type: string;
  size: string;
  memo: string;
}

/**
 * Interface representing a memo response from the API
 * Contains all metadata and content of a memo
 */
export interface MemoInfoResponse {
  name: string;
  uid: string;
  content: string;
  visibility: "PUBLIC" | "PROTECTED" | "PRIVATE";
  pinned: boolean;
  rowStatus: ROW_STATUS;
  resources: Resource[];
}

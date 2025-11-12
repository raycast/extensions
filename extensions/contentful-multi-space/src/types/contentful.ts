import type { Entry } from "contentful";

/**
 * Configuration for a single Contentful space
 */
export type SpaceConfig = {
  name: string;
  spaceId: string;
  accessToken: string;
  environment?: string;
};

/**
 * Normalized entry data for display in Raycast
 */
export type ContentfulEntry = {
  id: string;
  title: string;
  contentType: string;
  contentTypeId: string;
  spaceName: string;
  spaceId: string;
  environment: string;
  updatedAt: string;
  url: string;
  rawEntry: Entry;
};

/**
 * Generic fields that might exist on a Contentful entry
 */
export type EntryFields = {
  title?: string;
  name?: string;
  internalName?: string;
  displayName?: string;
  label?: string;
  [key: string]: unknown;
};

/**
 * Result from searching a single space
 */
export type SpaceSearchResult = {
  spaceConfig: SpaceConfig;
  entries: Entry[];
  error?: Error;
};

/**
 * Content type metadata for filtering and display
 */
export type ContentTypeInfo = {
  id: string;
  name: string;
  spaceId: string;
  spaceName: string;
};

/**
 * Feature option type (including enum)
 */
export type FeatureOptionType = "boolean" | "string" | "enum";

/**
 * A single devcontainer feature definition
 */
export interface Feature {
  /** Feature ID (e.g., "python", "node", "docker-in-docker") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Full reference for devcontainer.json (e.g., "ghcr.io/devcontainers/features/python:1") */
  reference: string;
  /** Description of what the feature provides */
  description?: string;
  /** URL to documentation */
  documentationURL?: string;
  /** Available options/configuration for this feature */
  options?: Record<string, FeatureOption>;
  /** Collection this feature belongs to */
  collection: CollectionInfo;
}

/**
 * Feature option definition
 */
export interface FeatureOption {
  /** Option type: boolean, string, or enum */
  type: FeatureOptionType;
  /** Possible enum values if type is string with limited options */
  enum?: string[];
  /** Default value */
  default?: string | boolean;
  /** Description of what this option does */
  description?: string;
  /** Proposals/suggestions for string values */
  proposals?: string[];
}

/**
 * Collection information (from collection-index.yml)
 */
export interface CollectionInfo {
  /** GitHub owner/repo (e.g., "devcontainers/features") */
  sourceInformation: string;
  /** Registry path (e.g., "ghcr.io/devcontainers/features") */
  ociReference: string;
}

/**
 * Raw devcontainer-collection.json structure from GHCR
 */
export interface DevContainerCollection {
  features: DevContainerFeature[];
  sourceInformation?: {
    source?: string;
  };
}

/**
 * Raw feature definition from devcontainer-collection.json
 */
export interface DevContainerFeature {
  id: string;
  name?: string;
  description?: string;
  documentationURL?: string;
  options?: Record<string, FeatureOption>;
}

/**
 * GHCR token response
 */
export interface GhcrTokenResponse {
  token: string;
}

/**
 * Cached GHCR token with expiration
 */
export interface CachedGhcrToken {
  token: string;
  repository: string;
  expiresAt: number;
}

/**
 * GHCR manifest response
 */
export interface GhcrManifest {
  layers: Array<{
    digest: string;
    mediaType: string;
    annotations?: Record<string, string>;
  }>;
}

/**
 * A script file (.sh) fetched from a feature's source directory
 */
export interface ScriptFile {
  name: string;
  content: string;
}

/**
 * Content fetched for a feature (README + scripts)
 */
export interface FeatureContent {
  readme: string | null;
  scripts: ScriptFile[];
}

/**
 * Cache entry with TTL metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Collection fetch result
 */
export interface CollectionFetchResult {
  collection: CollectionInfo;
  features: Feature[];
  error?: string;
}

import type { CollectionInfo, Feature } from "../types";

/**
 * Validate CollectionInfo has required fields
 */
function isValidCollectionInfo(
  collection: unknown,
): collection is CollectionInfo {
  if (collection === null || typeof collection !== "object") return false;
  const c = collection as Record<string, unknown>;
  return (
    typeof c.sourceInformation === "string" &&
    c.sourceInformation.length > 0 &&
    typeof c.ociReference === "string" &&
    c.ociReference.length > 0
  );
}

/**
 * Validate Feature has required fields
 */
function isValidFeature(feature: unknown): feature is Feature {
  if (feature === null || typeof feature !== "object") return false;
  const f = feature as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    f.id.length > 0 &&
    typeof f.name === "string" &&
    typeof f.reference === "string" &&
    f.collection !== undefined &&
    isValidCollectionInfo(f.collection)
  );
}

/**
 * Extract collection name from OCI reference
 * e.g., "ghcr.io/devcontainers/features" -> "devcontainers/features"
 */
export function getCollectionName(collection: CollectionInfo): string {
  if (!isValidCollectionInfo(collection)) {
    return "";
  }
  const ref = collection.ociReference;
  const match = ref.match(/ghcr\.io\/(.+)/);
  return match ? match[1] : ref;
}

/**
 * Get collection name from a feature
 */
export function getFeatureCollectionName(feature: Feature): string {
  if (!isValidFeature(feature)) {
    return "";
  }
  return getCollectionName(feature.collection);
}

/**
 * Check if a collection is the official devcontainers collection
 */
export function isOfficialCollection(collection: CollectionInfo): boolean {
  if (!isValidCollectionInfo(collection)) {
    return false;
  }
  return collection.ociReference.includes("devcontainers/features");
}

/**
 * Check if a feature belongs to the official collection
 */
export function isOfficialFeature(feature: Feature): boolean {
  if (!isValidFeature(feature)) {
    return false;
  }
  return isOfficialCollection(feature.collection);
}

/**
 * Sort features: official first, then alphabetically by name
 */
export function sortFeatures(features: Feature[]): Feature[] {
  if (!Array.isArray(features)) {
    return [];
  }

  // Filter out invalid features
  const validFeatures = features.filter(isValidFeature);

  return [...validFeatures].sort((a, b) => {
    const aIsOfficial = isOfficialFeature(a);
    const bIsOfficial = isOfficialFeature(b);

    if (aIsOfficial && !bIsOfficial) return -1;
    if (!aIsOfficial && bIsOfficial) return 1;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Get GitHub repository URL from source information
 */
export function getGitHubRepoUrl(sourceInfo: string): string {
  if (typeof sourceInfo !== "string" || sourceInfo.length === 0) {
    return "";
  }
  return `https://github.com/${sourceInfo}`;
}

/**
 * Get GitHub repository URL for a feature
 */
export function getFeatureGitHubUrl(feature: Feature): string {
  if (!isValidFeature(feature)) {
    return "";
  }
  return getGitHubRepoUrl(feature.collection.sourceInformation);
}

/**
 * Validate documentation URL format
 */
export function isValidDocumentationUrl(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

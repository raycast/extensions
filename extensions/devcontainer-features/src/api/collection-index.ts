import { parse as parseYaml } from "yaml";
import type { CollectionInfo } from "../types";
import { createAppError, createHttpError } from "../utils/errors";

const COLLECTION_INDEX_URL =
  "https://raw.githubusercontent.com/devcontainers/devcontainers.github.io/gh-pages/_data/collection-index.yml";

interface RawCollectionEntry {
  name: string;
  maintainer: string;
  contact: string;
  repository: string;
  ociReference: string;
}

/**
 * Validate a raw collection entry has required fields
 */
function isValidCollectionEntry(entry: unknown): entry is RawCollectionEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.repository === "string" &&
    e.repository.length > 0 &&
    typeof e.ociReference === "string" &&
    e.ociReference.length > 0
  );
}

/**
 * Extract GitHub owner/repo from repository URL
 * e.g., "https://github.com/devcontainers/features" -> "devcontainers/features"
 */
function extractSourceInfo(repositoryUrl: string): string {
  if (!repositoryUrl || typeof repositoryUrl !== "string") {
    return "";
  }
  const match = repositoryUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1] : repositoryUrl;
}

/**
 * Validate OCI reference format
 */
function isValidOciReference(ref: string): boolean {
  // Basic validation: should contain registry/owner/repo pattern
  return /^[a-z0-9.-]+\/[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(ref);
}

/**
 * Fetch and parse the collection index from GitHub
 */
export async function fetchCollectionIndex(): Promise<CollectionInfo[]> {
  const response = await fetch(COLLECTION_INDEX_URL);

  if (!response.ok) {
    throw createHttpError(
      response.status,
      `Failed to fetch collection index: ${response.status}`,
    );
  }

  const yamlContent = await response.text();

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (err) {
    throw createAppError(
      "INVALID_RESPONSE",
      "Failed to parse collection index YAML",
      err,
    );
  }

  if (!Array.isArray(parsed)) {
    throw createAppError(
      "INVALID_RESPONSE",
      "Invalid collection index format: expected array",
      {
        received: typeof parsed,
      },
    );
  }

  // Filter and validate entries
  const validEntries = parsed.filter(isValidCollectionEntry);

  return validEntries
    .filter((entry) => entry.ociReference.includes("feature"))
    .filter((entry) => isValidOciReference(entry.ociReference))
    .map((entry) => ({
      sourceInformation: extractSourceInfo(entry.repository),
      ociReference: entry.ociReference,
    }))
    .filter((info) => info.sourceInformation.length > 0);
}

/**
 * Filter collections by priority (official devcontainers first)
 */
export function sortCollections(
  collections: CollectionInfo[],
): CollectionInfo[] {
  if (!Array.isArray(collections)) {
    return [];
  }

  return [...collections].sort((a, b) => {
    // Official devcontainers/features first
    const aIsOfficial = a.ociReference.includes("devcontainers/features");
    const bIsOfficial = b.ociReference.includes("devcontainers/features");

    if (aIsOfficial && !bIsOfficial) return -1;
    if (!aIsOfficial && bIsOfficial) return 1;

    // Then sort alphabetically
    return a.ociReference.localeCompare(b.ociReference);
  });
}

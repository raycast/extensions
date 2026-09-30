import type {
  CachedGhcrToken,
  CollectionFetchResult,
  CollectionInfo,
  DevContainerCollection,
  Feature,
  GhcrManifest,
  GhcrTokenResponse,
} from "../types";
import { createHttpError, getUserErrorMessage } from "../utils/errors";
import { logDebug, logError } from "../utils/logger";
import { getConcurrency } from "../utils/preferences";

const GHCR_REGISTRY = "ghcr.io";
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Token cache
const tokenCache = new Map<string, CachedGhcrToken>();

/**
 * Parse OCI reference to extract repository path
 * e.g., "ghcr.io/devcontainers/features" -> "devcontainers/features"
 */
function parseOciReference(ociReference: string): string {
  const prefix = `${GHCR_REGISTRY}/`;
  if (ociReference.startsWith(prefix)) {
    return ociReference.slice(prefix.length);
  }
  return ociReference;
}

/**
 * Get anonymous token for GHCR repository (with caching)
 */
async function getGhcrToken(repository: string): Promise<string> {
  // Check cache first
  const cached = tokenCache.get(repository);
  if (cached && cached.expiresAt > Date.now()) {
    logDebug(`Using cached GHCR token for ${repository}`);
    return cached.token;
  }

  const scope = `repository:${repository}:pull`;
  const url = `https://${GHCR_REGISTRY}/token?scope=${encodeURIComponent(scope)}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = createHttpError(
      response.status,
      `Failed to get GHCR token for ${repository}`,
    );
    throw error;
  }

  const data = (await response.json()) as GhcrTokenResponse;

  // Cache the token
  tokenCache.set(repository, {
    token: data.token,
    repository,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  logDebug(`Fetched new GHCR token for ${repository}`);
  return data.token;
}

/**
 * Fetch manifest for devcontainer-collection
 */
async function fetchManifest(
  repository: string,
  token: string,
): Promise<GhcrManifest> {
  const url = `https://${GHCR_REGISTRY}/v2/${repository}/manifests/latest`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.oci.image.manifest.v1+json",
    },
  });

  if (!response.ok) {
    const error = createHttpError(
      response.status,
      `Failed to fetch manifest for ${repository}`,
    );
    throw error;
  }

  return (await response.json()) as GhcrManifest;
}

/**
 * Fetch and parse devcontainer-collection.json blob
 */
async function fetchCollectionBlob(
  repository: string,
  digest: string,
  token: string,
): Promise<DevContainerCollection> {
  const url = `https://${GHCR_REGISTRY}/v2/${repository}/blobs/${digest}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = createHttpError(
      response.status,
      `Failed to fetch blob for ${repository}`,
    );
    throw error;
  }

  return (await response.json()) as DevContainerCollection;
}

/**
 * Find the devcontainer-collection.json layer in manifest
 * Improved detection with multiple strategies
 */
function findCollectionLayer(manifest: GhcrManifest): string | null {
  // Strategy 1: Look for specific media type
  const byMediaType = manifest.layers.find(
    (layer) =>
      layer.mediaType ===
      "application/vnd.devcontainers.collection.layer.v1+json",
  );
  if (byMediaType) return byMediaType.digest;

  // Strategy 2: Look for annotation with title
  const byTitle = manifest.layers.find(
    (layer) =>
      layer.annotations?.["org.opencontainers.image.title"] ===
      "devcontainer-collection.json",
  );
  if (byTitle) return byTitle.digest;

  // Strategy 3: Look for annotation with type
  const byType = manifest.layers.find(
    (layer) => layer.annotations?.["dev.containers.type"] === "collection",
  );
  if (byType) return byType.digest;

  // Strategy 4: Look for any JSON layer
  const jsonLayer = manifest.layers.find((layer) =>
    layer.mediaType.includes("json"),
  );
  if (jsonLayer) return jsonLayer.digest;

  // Fallback: use first layer
  return manifest.layers[0]?.digest ?? null;
}

/**
 * Fetch features from a single collection
 */
export async function fetchCollectionFeatures(
  collection: CollectionInfo,
): Promise<CollectionFetchResult> {
  const repository = parseOciReference(collection.ociReference);

  try {
    const token = await getGhcrToken(repository);
    const manifest = await fetchManifest(repository, token);

    const layerDigest = findCollectionLayer(manifest);
    if (!layerDigest) {
      return {
        collection,
        features: [],
        error: "No collection layer found in manifest",
      };
    }

    const blob = await fetchCollectionBlob(repository, layerDigest, token);
    const features = convertToFeatures(blob, collection);

    return { collection, features };
  } catch (error) {
    const message = getUserErrorMessage(error);
    logError(`Failed to fetch collection ${collection.ociReference}`, error);
    return {
      collection,
      features: [],
      error: message,
    };
  }
}

/**
 * Convert raw collection data to Feature objects
 */
function convertToFeatures(
  collectionData: DevContainerCollection,
  collection: CollectionInfo,
): Feature[] {
  if (!collectionData.features || !Array.isArray(collectionData.features)) {
    return [];
  }

  return collectionData.features.map((feature) => ({
    id: feature.id,
    name: feature.name || feature.id,
    reference: `${collection.ociReference}/${feature.id}:1`,
    description: feature.description,
    documentationURL: feature.documentationURL,
    options: feature.options,
    collection,
  }));
}

/**
 * Fetch features from multiple collections with concurrency control
 */
export async function fetchAllFeatures(
  collections: CollectionInfo[],
  concurrency?: number,
  onProgress?: (
    completed: number,
    total: number,
    failedCollections: string[],
  ) => void,
): Promise<{
  features: Feature[];
  failedCollections: CollectionFetchResult[];
}> {
  const effectiveConcurrency = concurrency ?? getConcurrency();
  const allFeatures: Feature[] = [];
  const failedCollections: CollectionFetchResult[] = [];
  let completed = 0;

  // Process in batches
  for (let i = 0; i < collections.length; i += effectiveConcurrency) {
    const batch = collections.slice(i, i + effectiveConcurrency);
    const results = await Promise.allSettled(
      batch.map((c) => fetchCollectionFeatures(c)),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const fetchResult = result.value;
        if (fetchResult.error) {
          failedCollections.push(fetchResult);
        } else {
          allFeatures.push(...fetchResult.features);
        }
      }
      completed++;
    }

    const failedNames = failedCollections.map((f) => f.collection.ociReference);
    onProgress?.(completed, collections.length, failedNames);
  }

  return { features: allFeatures, failedCollections };
}

/**
 * Clear token cache (useful for testing or when tokens might be invalid)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

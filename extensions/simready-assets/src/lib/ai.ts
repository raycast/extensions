import { contentUrl, DATASET_URL, fileGroup, fileUrl, formatBytes } from "./assets";
import type { AssetDetails, RepositoryEntry } from "./assets";

export const SOURCE = { name: "SimReady Assets", publisher: "NVIDIA", url: DATASET_URL };

export function validatePagination(limit: number, offset: number, maxLimit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new Error(`limit must be an integer between 1 and ${maxLimit}.`);
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("offset must be a non-negative integer.");
  }
}

export function paginate<T>(items: T[], limit: number, offset: number) {
  const results = items.slice(offset, offset + limit);
  const nextOffset = offset + results.length < items.length ? offset + results.length : null;
  return {
    total: items.length,
    returned: results.length,
    offset,
    limit,
    hasMore: nextOffset !== null,
    nextOffset,
    results,
  };
}

export function describeFile(file: RepositoryEntry, details: AssetDetails) {
  return {
    path: file.path,
    relativePath: file.path.slice(details.id.length + 1),
    group: fileGroup(file, details),
    sizeBytes: file.size,
    size: formatBytes(file.size),
    url: fileUrl(file.path),
    downloadUrl: contentUrl(file.path, true),
  };
}

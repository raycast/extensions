import type { Resource } from "../types";

// One lowercase search blob per item, rebuilt only when the items array identity changes.
// Query terms are whitespace-free, so matching the joined blob equals matching per field.
const searchBlobCache = new WeakMap<Resource[], string[]>();

function searchBlobs(resources: Resource[]): string[] {
  let blobs = searchBlobCache.get(resources);
  if (!blobs) {
    blobs = resources.map((resource) =>
      [resource.name, resource.username, resource.uri, ...(resource.uris ?? []), resource.description]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase(),
    );
    searchBlobCache.set(resources, blobs);
  }
  return blobs;
}

export function filterResources(resources: Resource[], query: string): Resource[] {
  if (!query) return resources;

  const lowerQuery = query.toLowerCase();
  const blobs = searchBlobs(resources);
  return resources.filter((_resource, index) => blobs[index].includes(lowerQuery));
}

import type { Resource } from "../types";

// One lowercase search blob per item, rebuilt only when the items array identity changes.
// Every query term must match the blob. Terms are whitespace-free, so a single term can only
// match within one field, while different terms may match different fields (e.g. one term in
// the email, another in the name), which is the multi-term behavior users expect from search.
const searchBlobCache = new WeakMap<Resource[], string[]>();

function searchBlobs(resources: Resource[]): string[] {
  let blobs = searchBlobCache.get(resources);
  if (!blobs) {
    blobs = resources.map((resource) =>
      [
        resource.name,
        resource.username,
        resource.uri,
        ...(resource.uris ?? []),
        resource.description,
        ...(resource.tags ?? []).map((tag) => tag.slug),
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase(),
    );
    searchBlobCache.set(resources, blobs);
  }
  return blobs;
}

export function filterResources(resources: Resource[], query: string): Resource[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return resources;

  const blobs = searchBlobs(resources);
  return resources.filter((_resource, index) => terms.every((term) => blobs[index].includes(term)));
}

import type { Resource } from "../types";

export function filterResources(resources: Resource[], query: string): Resource[] {
  if (!query) return resources;

  const lowerQuery = query.toLowerCase();
  return resources.filter((resource) =>
    [resource.name, resource.username, resource.uri, ...(resource.uris ?? []), resource.description].some(
      (value) => typeof value === "string" && value.toLowerCase().includes(lowerQuery),
    ),
  );
}

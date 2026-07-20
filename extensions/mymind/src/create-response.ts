export function extractCreatedObjectId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  if ("id" in data && typeof data.id === "string" && data.id.trim()) {
    return data.id;
  }

  for (const key of ["object", "data", "item", "result"]) {
    if (key in data) {
      const nestedId = extractCreatedObjectId(data[key as keyof typeof data]);

      if (nestedId) {
        return nestedId;
      }
    }
  }

  return undefined;
}

export function extractObjectIdFromLocationHeader(location?: string): string | undefined {
  if (!location) {
    return undefined;
  }

  try {
    const pathname = new URL(location, "https://api.mymind.com").pathname;
    const match = pathname.match(/\/objects\/([^/?#]+)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export interface MapSearchLinks {
  googleMaps: string;
  appleMaps: string;
}

function joinQueryParts(parts: Array<string | undefined>): string | undefined {
  const value = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return value || undefined;
}

export function buildMapSearchLinks(companyName?: string, primaryAddress?: string): MapSearchLinks | undefined {
  const query = joinQueryParts([companyName, primaryAddress]);
  if (!query) {
    return undefined;
  }

  const encoded = encodeURIComponent(query);

  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    appleMaps: `https://maps.apple.com/?q=${encoded}`,
  };
}

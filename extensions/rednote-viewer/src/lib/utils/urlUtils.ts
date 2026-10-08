export function extractUri(url: string): string {
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("URL must be a non-empty string");
  }

  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "http://placeholder");
  } catch {
    throw new Error(`Cannot extract valid URI path from URL: ${trimmed}`);
  }

  const path = parsed.pathname;

  if (!path || path === "/") {
    throw new Error(`Cannot extract valid URI path from URL: ${trimmed}`);
  }

  return path;
}

export function buildUrl(baseUrl: string, params: Record<string, unknown> | null = null): string {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new Error("base_url must be a non-empty string");
  }

  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const queryParts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    let formattedValue: string;
    if (Array.isArray(value)) {
      formattedValue = value.map((v) => String(v)).join(",");
    } else if (value === null || value === undefined) {
      formattedValue = "";
    } else {
      formattedValue = String(value);
    }

    const encodedValue = formattedValue.replace(/=/g, "%3D");
    queryParts.push(`${key}=${encodedValue}`);
  }

  const queryString = queryParts.join("&");
  let separator: string;
  if (!baseUrl.includes("?")) {
    separator = "?";
  } else if (baseUrl.endsWith("?") || baseUrl.endsWith("&")) {
    separator = "";
  } else {
    separator = "&";
  }

  return `${baseUrl}${separator}${queryString}`;
}

export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveUrl(base: string, relative: string): string {
  // Handle data URIs - return as-is
  if (relative.startsWith("data:")) {
    return relative;
  }

  // Handle already absolute URLs
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }

  // Handle protocol-relative URLs
  if (relative.startsWith("//")) {
    const baseUrl = new URL(base);
    return `${baseUrl.protocol}${relative}`;
  }

  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

export function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

export function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters for filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

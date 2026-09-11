/** Attio requires https for webhook targets (spec: POST /v2/webhooks pattern `^https:\/\/.*`). */
export function isValidWebhookUrl(s: string): boolean {
  if (!s) return false;
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
}

export function compactWebhookUrl(url: string, wide: boolean): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname || "";
    const path = parsed.pathname.replace(/^\/|\/$/g, ""); // Strip leading/trailing slashes

    // No path: just return host
    if (!path) {
      return host;
    }

    const segments = path.split("/").filter(Boolean);

    // Single segment or short URL: return as-is
    if (segments.length === 1) {
      return `${host}/${path}`;
    }

    // Check if full host+path fits in 60 chars
    const fullHostPath = `${host}/${path}`;
    if (fullHostPath.length <= 60 && wide) {
      return fullHostPath;
    }

    // Compact mode (wide=false): host/…/lastSegment
    if (!wide) {
      const lastSegment = segments[segments.length - 1];
      return `${host}/…/${lastSegment}`;
    }

    // Wide mode (wide=true, long path): host/firstSegment/…/lastSegment
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    return `${host}/${firstSegment}/…/${lastSegment}`;
  } catch {
    // Invalid URL: return unchanged
    return url;
  }
}

export function sanitizeDomainForFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname || "";
    // Lowercase, replace non-[a-z0-9] with underscore, collapse repeats, trim edges
    return hostname
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  } catch {
    // Invalid URL
    return "webhook";
  }
}

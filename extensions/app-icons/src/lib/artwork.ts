export function artworkUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 2000) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname;
    const allowed = host === "mzstatic.com" || host.endsWith(".mzstatic.com");
    if (url.protocol !== "https:" || !allowed) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Accept App Store product pages from the Search API (`trackViewUrl`). */
export function storeViewUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 2000) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = host === "apps.apple.com" || host === "itunes.apple.com";
    if (url.protocol !== "https:" || !allowed) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function iconFilename(name: string): string {
  const sanitized = [...name]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && !'\\/:*?"<>|'.includes(char);
    })
    .join("");
  const base = sanitized.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!base || base === "." || base === "..") return "app-icon.png";
  return `${base}.png`;
}

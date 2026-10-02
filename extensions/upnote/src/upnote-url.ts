/** Builds a percent-encoded UpNote x-callback-url. */
export function buildUpnoteUrl(action: string, params: Record<string, string | boolean | undefined>): string {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string | boolean] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `upnote://x-callback-url/${action}?${query}`;
}

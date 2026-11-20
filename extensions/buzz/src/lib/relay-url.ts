/**
 * Normalize a relay URL for the HTTP bridge. Coerces the WebSocket schemes
 * (wss://, ws://) that Nostr relays are usually written with into the HTTP
 * schemes the bridge needs (https://, http://), and strips trailing slashes so
 * endpoint paths join cleanly. An already-http(s) URL is left as-is.
 */
export function normalizeRelayUrl(input: string): string {
  let url = (input ?? "").trim();
  if (/^wss:\/\//i.test(url)) {
    url = "https://" + url.slice(url.indexOf("://") + 3);
  } else if (/^ws:\/\//i.test(url)) {
    url = "http://" + url.slice(url.indexOf("://") + 3);
  }
  return url.replace(/\/+$/, "");
}

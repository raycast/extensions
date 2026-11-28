const BASE = "goodlinks://x-callback-url";
export function openLink(url: string) {
  return `${BASE}/open?url=${encodeURIComponent(url)}`;
}

export function randomLink() {
  return `${BASE}/random`;
}

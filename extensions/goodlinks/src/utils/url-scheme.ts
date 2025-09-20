const BASE = "goodlinks://x-callback-url";
export function openLink(url: string) {
  return `${BASE}/open?url=${url}`;
}

export function randomLink() {
  return `${BASE}/random`;
}

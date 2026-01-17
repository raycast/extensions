import { showHUD, Cache } from "@raycast/api";

interface Status {
  online: boolean;
  timestamp: number;
  offlineSince: number | null;
}

const cache = new Cache();
const CACHE_KEY = "status";
const ENDPOINTS = ["https://captive.apple.com/hotspot-detect.html", "https://cloudflare.com/cdn-cgi/trace"];

async function checkConnectivity(): Promise<boolean> {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (res.ok) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export default async function Command(): Promise<void> {
  const online = await checkConnectivity();
  const now = Date.now();

  const cached = cache.get(CACHE_KEY);
  const prev = cached ? (JSON.parse(cached) as Status) : null;
  const offlineSince = !online ? (prev?.online === false ? prev.offlineSince : now) : null;

  cache.set(CACHE_KEY, JSON.stringify({ online, timestamp: now, offlineSince }));
  await showHUD(`${online ? "✓" : "✗"} Internet: ${online ? "Online" : "Offline"}`);
}

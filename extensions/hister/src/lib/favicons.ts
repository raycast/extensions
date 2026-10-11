import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFavicon } from "../api";

// Keys are content hashes, so a cached icon never goes stale.
const cache = new Cache({ namespace: "favicons" });
// Shared across renders so a missing favicon is asked for once per session, not on every keystroke.
const failed = new Set<string>();

/** Favicons need the access token, which an image URL can't carry, so they are fetched and cached as data URIs. */
export function useFavicons(keys: (string | undefined)[]): (key?: string) => string | undefined {
  const signature = [...new Set(keys.filter(Boolean))].sort().join("\n");
  const [fetched, setFetched] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const queue = signature.split("\n").filter((key) => key && !cache.has(key) && !failed.has(key));
    const worker = async () => {
      for (let key = queue.shift(); key && !cancelled; key = queue.shift()) {
        try {
          const uri = await getFavicon(key);
          cache.set(key, uri);
          setFetched((current) => ({ ...current, [key]: uri }));
        } catch {
          failed.add(key);
        }
      }
    };
    Promise.all(Array.from({ length: Math.min(5, queue.length) }, worker));
    return () => {
      cancelled = true;
    };
  }, [signature]);

  return (key) => (key ? (fetched[key] ?? cache.get(key)) : undefined);
}

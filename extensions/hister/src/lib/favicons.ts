import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { getFavicon } from "../api";

const folder = join(environment.supportPath, "favicons");
const extensions: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

// Keys are content hashes, so a saved icon never goes stale.
const saved = new Map(
  (existsSync(folder) ? readdirSync(folder) : []).map((file) => [file.replace(/\.\w+$/, ""), join(folder, file)]),
);
// Shared across renders so a missing favicon is asked for once per session, not on every keystroke.
const failed = new Set<string>();

/** Fetched with the access token and saved as files; large data-URI icons freeze Raycast's window. */
export function useFavicons(keys: (string | undefined)[]): (key?: string) => string | undefined {
  const signature = [...new Set(keys.filter(Boolean))].sort().join("\n");
  const [, setSavedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const queue = signature.split("\n").filter((key) => key && !saved.has(key) && !failed.has(key));
    const worker = async () => {
      for (let key = queue.shift(); key && !cancelled; key = queue.shift()) {
        try {
          const { type, data } = await getFavicon(key);
          const path = join(folder, `${key}.${extensions[type] ?? "png"}`);
          mkdirSync(folder, { recursive: true });
          writeFileSync(path, data);
          saved.set(key, path);
          setSavedCount((count) => count + 1);
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

  return (key) => (key ? saved.get(key) : undefined);
}

import { environment } from "@raycast/api";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "./preferences";
import type { RokuDevice } from "./types";

const pending = new Map<string, Promise<string | undefined>>();

function iconPath(device: RokuDevice, appId: string): string {
  const safe = `${device.id}-${appId}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(environment.supportPath, "icons", `${safe}.img`);
}

/** Path of a cached app icon, if it has been downloaded already. */
export function cachedIcon(device: RokuDevice, appId: string): string | undefined {
  const path = iconPath(device, appId);
  return existsSync(path) ? path : undefined;
}

/** Download (once) and return a local file path for an app icon. Never throws. */
export function loadIcon(device: RokuDevice, appId: string): Promise<string | undefined> {
  const path = iconPath(device, appId);
  if (existsSync(path)) return Promise.resolve(path);
  const key = path;
  const existing = pending.get(key);
  if (existing) return existing;
  const work = (async () => {
    try {
      const bytes = await createClient(device).getIcon(appId);
      await mkdir(join(environment.supportPath, "icons"), { recursive: true });
      await writeFile(path, bytes);
      return path;
    } catch {
      return undefined;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, work);
  return work;
}

/** Download several icons with limited concurrency; resolves to appId → path. */
export async function loadIcons(
  device: RokuDevice,
  appIds: string[],
  concurrency = 6,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const queue = [...appIds];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        const path = await loadIcon(device, id);
        if (path) result[id] = path;
      }
    }),
  );
  return result;
}

import { rmSync } from "node:fs";
import { Cache, LocalStorage } from "@raycast/api";

const REDACTED_CACHE_KEY = "jumpseat-redacted-flight-cache-v2";
const PREVIOUS_REDACTED_CACHE_KEY = "jumpseat-redacted-flight-cache-v1";

export function clearFlightCache(): void {
  // useCachedPromise creates function-derived namespace subdirectories.
  // Remove the extension's entire disposable cache, including older namespaces.
  // OAuth credentials and LocalStorage are stored separately by Raycast.
  rmSync(new Cache().storageDirectory, { recursive: true, force: true });
}

export async function migrateFlightCache(): Promise<void> {
  if (await LocalStorage.getItem<boolean>(REDACTED_CACHE_KEY)) return;
  clearFlightCache();
  await LocalStorage.setItem(REDACTED_CACHE_KEY, true);
  await LocalStorage.removeItem(PREVIOUS_REDACTED_CACHE_KEY);
}

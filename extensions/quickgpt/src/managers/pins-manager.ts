import type { Cache } from "@raycast/api";
import { createNamespacedCache } from "../utils/extension-cache";

class PinsManager {
  private cache: Cache;
  private key: string;

  constructor(cache: Cache, key = "pinnedIdentifiers") {
    this.cache = cache;
    this.key = key;
  }

  pin(identifier: string): void {
    let pinned = this.pinnedIdentifiers();
    pinned = pinned.filter((id) => id !== identifier);
    pinned.unshift(identifier);
    this.cache.set(this.key, JSON.stringify(pinned));
  }

  unpin(identifier: string): void {
    let pinned = this.pinnedIdentifiers();
    pinned = pinned.filter((id) => id !== identifier);
    this.cache.set(this.key, JSON.stringify(pinned));
  }

  pinnedIdentifiers(): string[] {
    const pinnedJson = this.cache.get(this.key);
    try {
      const parsed = pinnedJson ? JSON.parse(pinnedJson) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse pinned identifiers from cache:", e);
      return [];
    }
  }
}

const cache = createNamespacedCache("pins-v1", ["pinnedIdentifiers"]);
const pinsManager = new PinsManager(cache);

export default pinsManager;

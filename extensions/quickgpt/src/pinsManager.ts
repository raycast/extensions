import { Cache } from "@raycast/api";

class PinsManager {
  private cache: Cache;
  private key: string;

  constructor(cache: Cache, key = "pinnedIdentifiers") {
    this.cache = cache;
    this.key = key;
  }

  pin(identifier: string) {
    const pinned = this.pinnedIdentifiers();
    pinned.add(identifier);
    this.cache.set(this.key, JSON.stringify(Array.from(pinned)));
  }

  unpin(identifier: string) {
    const pinned = this.pinnedIdentifiers();
    pinned.delete(identifier);
    this.cache.set(this.key, JSON.stringify(Array.from(pinned)));
  }

  pinnedIdentifiers(): Set<string> {
    const pinned = this.cache.get(this.key);
    return new Set(pinned ? JSON.parse(pinned) : []);
  }
}

const cache = new Cache();
const pinsManager = new PinsManager(cache);

export default pinsManager;

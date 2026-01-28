import { Cache } from "@raycast/api";

export class CacheAdapter {
  private readonly key: string;
  private readonly cache: Cache;

  constructor(key: string) {
    this.key = key;
    this.cache = new Cache({
      namespace: "ac.grok",
    });
  }

  get() {
    return this.cache.get(this.key);
  }

  set(value: string) {
    this.cache.set(this.key, value);
  }
}

import { Cache } from "@raycast/api";

import type { StringCache } from "./snapshot.js";

export class RaycastSnapshotCache implements StringCache {
  private readonly cache = new Cache({ namespace: "promptty-read-only-snapshot" });

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: string): void {
    this.cache.set(key, value);
  }

  remove(key: string): void {
    this.cache.remove(key);
  }
}

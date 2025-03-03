import type { AppItem } from "./types";

import { Application, Cache, getApplications } from "@raycast/api";
import EventEmitter from "events";
import { deepEqual, filterApps, sleep } from "./utils";

/**
 * AppManager is responsible for fetching and caching apps.
 * It returns the cached apps immediately and then fetches the apps in the background.
 * When the apps are fetched, it compares them to the cached version and emits an update event if they changed.
 */
export class AppManager {
  cache: Cache;
  emitter: EventEmitter;

  constructor() {
    this.cache = new Cache();
    this.emitter = new EventEmitter();
  }

  public async getApps(): Promise<void> {
    const apps = this.readCache();
    if (apps.length) {
      this.emitter.emit("update", apps);
      // allow react to render the cached apps
      await sleep();
    }
    // fetch apps, check if they changed from the cached version
    // and if so - update the cache and emit the update
    getApplications()
      .then((_apps: Application[]) => filterApps(_apps))
      .then((_apps: Application[]) => this.enrich(_apps))
      .then((_apps: AppItem[]) => {
        if (deepEqual(_apps, apps)) return; // no changes
        this.saveCache(_apps);
        this.emitter.emit("update", _apps);
      })
      .catch((error) => {
        console.error("Failed to fetch or process applications:", error);
        this.emitter.emit("error", error);
      });
  }

  /**
   * Attach author & location to each app
   */
  enrich(apps: Application[]): AppItem[] {
    const newApps: AppItem[] = [];
    for (const app of apps) {
      const location = app.path.split("/").slice(1, -1).join("/");
      let brand = app.bundleId?.split(".")[1] || "";
      brand = brand.charAt(0).toUpperCase() + brand.slice(1);

      newApps.push({ ...app, brand, location });
    }
    return newApps;
  }

  saveCache(apps: AppItem[]) {
    this.cache.set("apps", JSON.stringify(apps));
  }

  readCache(): AppItem[] {
    const cached = this.cache.get("apps");
    return cached ? JSON.parse(cached) : [];
  }
}

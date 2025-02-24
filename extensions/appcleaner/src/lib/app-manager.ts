import type { AppItem } from "./types";

import EventEmitter from "events";
import { Application, Cache, getApplications } from "@raycast/api";
import { deepEqual, sleep } from "./utils";
import { filterApps, isSystem, getIcon } from "./app-utils";

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
      const filteredApps = filterApps(apps);
      this.emitter.emit("update", filteredApps);
      // allow react to render the cached apps
      await sleep();
    }
    // fetch apps, check if they changed from the cached version
    // and if so - update the cache and emit the update
    getApplications()
      .then((_apps: Application[]) => this.enrich(_apps))
      .then((_apps: AppItem[]) => {
        if (deepEqual(_apps, apps)) return; // no changes

        this.saveCache(_apps);
        const filteredApps = filterApps(_apps);
        this.emitter.emit("update", filteredApps);
      });
  }

  /**
   * Attach icon path and system app status to each app
   */
  enrich(apps: Application[]): AppItem[] {
    const newApps: AppItem[] = [];
    for (const app of apps) {
      const icon = getIcon(app);
      const isSystemApp = isSystem(app.path);
      const location = app.path.split("/").slice(1, -1).join("/");

      let brand = app.bundleId?.split(".")[1] || "";
      brand = brand.charAt(0).toUpperCase() + brand.slice(1);

      newApps.push({ ...app, icon, isSystemApp, brand, location });
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

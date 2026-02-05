import { homedir } from "os";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { VessloApp, VessloData } from "../types";

const DATA_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Vesslo",
  "raycast_data.json",
);

/**
 * Load and validate Vesslo data from JSON file
 * Includes runtime validation to prevent undefined errors
 */
export function loadVessloData(): VessloData | null {
  try {
    if (!existsSync(DATA_PATH)) {
      return null;
    }

    const content = readFileSync(DATA_PATH, "utf-8");
    const parsed = JSON.parse(content);

    // Validate required structure
    if (!parsed || typeof parsed !== "object") {
      console.error("Invalid Vesslo data: not an object");
      return null;
    }

    if (!parsed.apps || !Array.isArray(parsed.apps)) {
      console.error("Invalid Vesslo data: apps is not an array");
      return null;
    }

    // Normalize and validate each app
    const validatedApps: VessloApp[] = parsed.apps
      .filter((app: unknown) => {
        // Skip invalid entries
        if (!app || typeof app !== "object") return false;
        const a = app as Record<string, unknown>;
        // Must have at least id, name, path
        return a.id && a.name && a.path;
      })
      .map((app: Partial<VessloApp>) => ({
        id: app.id ?? "",
        name: app.name ?? "Unknown",
        bundleId: app.bundleId ?? null,
        version: app.version ?? null,
        targetVersion: app.targetVersion ?? null,
        developer: app.developer ?? null,
        path: app.path ?? "",
        icon: app.icon ?? null,
        tags: Array.isArray(app.tags) ? app.tags : [],
        memo: app.memo ?? null,
        sources: Array.isArray(app.sources) ? app.sources : [],
        appStoreId: app.appStoreId ?? null,
        homebrewCask: app.homebrewCask ?? null,
      }));

    return {
      exportedAt: parsed.exportedAt ?? new Date().toISOString(),
      updateCount: parsed.updateCount ?? 0,
      apps: validatedApps,
    };
  } catch (error) {
    console.error("Failed to load Vesslo data:", error);
    return null;
  }
}

/**
 * Check if Vesslo data is fresh (within 24 hours)
 */
export function isVessloDataFresh(): boolean {
  try {
    if (!existsSync(DATA_PATH)) {
      return false;
    }
    const data = loadVessloData();
    if (!data) return false;

    const exportedAt = new Date(data.exportedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - exportedAt.getTime()) / (1000 * 60 * 60);

    return hoursDiff < 24;
  } catch {
    return false;
  }
}

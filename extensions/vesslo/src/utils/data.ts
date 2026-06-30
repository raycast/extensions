import { homedir } from "os";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { VessloApp, VessloData } from "../types";

const DATA_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Vesslo",
  "raycast_data.json",
);

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return stringOrNull(value) ?? fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function getVessloDataModifiedTime(): number | null {
  try {
    if (!existsSync(DATA_PATH)) {
      return null;
    }
    return statSync(DATA_PATH).mtimeMs;
  } catch {
    return null;
  }
}

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
        return (
          typeof a.id === "string" &&
          typeof a.name === "string" &&
          typeof a.path === "string"
        );
      })
      .map((app: unknown) => {
        const a = app as Record<string, unknown>;
        return {
          id: stringOrFallback(a.id, ""),
          name: stringOrFallback(a.name, "Unknown"),
          bundleId: stringOrNull(a.bundleId),
          version: stringOrNull(a.version),
          targetVersion: stringOrNull(a.targetVersion),
          developer: stringOrNull(a.developer),
          path: stringOrFallback(a.path, ""),
          icon: stringOrNull(a.icon),
          tags: stringArray(a.tags),
          memo: stringOrNull(a.memo),
          sources: stringArray(a.sources),
          appStoreId: stringOrNull(a.appStoreId),
          homebrewCask: stringOrNull(a.homebrewCask),
          isVisibleInUpdates:
            typeof a.isVisibleInUpdates === "boolean"
              ? a.isVisibleInUpdates
              : null,
          eligibilityKind: stringOrNull(a.eligibilityKind),
          primaryActionKind: stringOrNull(a.primaryActionKind),
          isDeleted: a.isDeleted === true,
          isSkipped: a.isSkipped === true,
          isIgnored: a.isIgnored === true,
        };
      });

    return {
      exportedAt: stringOrFallback(parsed.exportedAt, new Date().toISOString()),
      updateCount:
        typeof parsed.updateCount === "number" ? parsed.updateCount : 0,
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

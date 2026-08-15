import { readFile } from "fs/promises";
import * as yaml from "js-yaml";
import type { App } from "../types";

/**
 * Read a YAML file from the filesystem
 */
export async function readYamlFile(filePath: string): Promise<string> {
  return await readFile(filePath, "utf8");
}

/**
 * Parse YAML content into a JavaScript object
 */
export function parseYaml(raw: string): unknown {
  return yaml.load(raw);
}

// Type for raw app data from YAML
interface RawAppData {
  name?: string;
  id?: string;
  value?: string;
  urlTemplate?: string;
  template?: string;
  placeholder?: string;
  visible?: boolean;
  enabled?: boolean;
}

/**
 * Normalize parsed YAML settings into a standardized App array
 * Converts "enabled" to "visible" to match show/hide terminology
 */
export function normalizeSettings(doc: unknown): App[] {
  if (!doc || typeof doc !== "object") return [];
  const root = doc as { apps?: RawAppData[]; customApps?: RawAppData[] };

  // Handle both "apps" and "customApps" arrays for flexibility
  const apps = root.apps || root.customApps || [];
  if (!Array.isArray(apps)) return [];

  return apps
    .map((a: RawAppData) => ({
      name: String(a.name ?? a.id ?? ""),
      value: String(a.value ?? a.id ?? ""),
      urlTemplate: String(a.urlTemplate ?? a.template ?? ""),
      placeholder: String(a.placeholder ?? "username"),
      // Convert "enabled" to "visible" for consistency with show/hide terminology
      visible: typeof a.visible === "boolean" ? a.visible : typeof a.enabled === "boolean" ? a.enabled : true,
    }))
    .filter((a) => a.name && a.value && a.urlTemplate);
}

/**
 * Normalize app settings from YAML, converting "enabled" to "visible"
 */
export function normalizeAppSettings(doc: unknown): Record<string, boolean> {
  if (!doc || typeof doc !== "object") return {};
  const root = doc as { appSettings?: Record<string, boolean> };

  if (!root.appSettings || typeof root.appSettings !== "object") return {};

  // Convert the settings, treating both "enabled" and "visible" as valid keys
  const normalized: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(root.appSettings)) {
    if (typeof value === "boolean") {
      normalized[key] = value;
    }
  }

  return normalized;
}

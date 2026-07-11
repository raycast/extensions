import { getPreferenceValues } from "@raycast/api";
import { ConfiguredCiJob, GearsetApiKind, GearsetPreferences } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPreferences(): GearsetPreferences {
  return getPreferenceValues<GearsetPreferences>();
}

export function parseConfiguredJobs(value?: string): ConfiguredCiJob[] {
  if (!value?.trim()) return [];

  return value
    .split(/\r?\n|;/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [rawName, rawId, rawEnvironment = "sandbox"] = entry.split("|").map((part) => part.trim());
      if (!rawName || !rawId || !UUID_PATTERN.test(rawId)) {
        throw new Error(`Invalid CI job on line ${index + 1}. Use Name|Job UUID|sandbox or production.`);
      }
      const environment = rawEnvironment.toLowerCase();
      if (environment !== "sandbox" && environment !== "production") {
        throw new Error(`Invalid environment on line ${index + 1}. Use sandbox or production.`);
      }
      return { name: rawName, id: rawId, environment };
    });
}

export function getApiToken(kind: GearsetApiKind, preferences = getPreferences()): string | undefined {
  const value = {
    automation: preferences.apiToken,
    reporting: preferences.reportingApiToken,
    audit: preferences.auditApiToken,
  }[kind];
  return value?.trim() || undefined;
}

export function requireApiToken(kind: GearsetApiKind, preferences = getPreferences()): string {
  const token = getApiToken(kind, preferences);
  if (!token) {
    const label = `${kind.charAt(0).toUpperCase()}${kind.slice(1)} API`;
    throw new Error(`Add a scoped Gearset ${label} token in the extension preferences.`);
  }
  return token;
}

export function retentionPreferences(preferences = getPreferences()): { days: number; limit: number } {
  const days = Number.parseInt(preferences.historyDays, 10);
  const limit = Number.parseInt(preferences.historyLimit, 10);
  return {
    days: Number.isFinite(days) && days > 0 ? days : 30,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 100,
  };
}

export function deploymentHistoryDays(preferences = getPreferences()): number {
  const days = Number.parseInt(preferences.deploymentHistoryDays, 10);
  return Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 30;
}

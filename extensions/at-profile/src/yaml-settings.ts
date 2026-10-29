import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { extname, join } from "path";
import { countOf } from "@chrismessina/raycast-kit/plural";
import * as yaml from "js-yaml";
import { getPreferenceValues } from "@raycast/api";
import { getAppEntries, importCustomApp, mergeAppVisibility } from "./helpers/apps";
import { getHistoryPairKey, MAX_HISTORY_ITEMS, sortHistory } from "./helpers/history";
import { getUsageHistory, isValidTimestamp, setUsageHistory, toOpenCount, withStorageLock } from "./helpers/storage";
import { UsageHistoryItem, YAMLSettings } from "./types";
import { isDefaultApp } from "./utils/default-apps";
import { validateAndSanitizeFilename, validatePathInDirectory } from "./utils/file-security";

/**
 * Export all settings to YAML format
 */
export async function exportSettingsToYAML(): Promise<string> {
  const [entries, usageHistory] = await Promise.all([getAppEntries(), getUsageHistory()]);

  const settings: YAMLSettings = {
    version: "1.0",
    usageHistory: sortHistory(usageHistory),
    visible: Object.fromEntries(
      entries.filter((entry) => entry.isDefault).map((entry) => [entry.value, entry.visible]),
    ),
    customApps: entries
      .filter((entry) => !entry.isDefault)
      .map(({ name, value, urlTemplate, visible }) => ({ name, value, urlTemplate, visible })),
  };

  return yaml.dump(settings, { indent: 2, lineWidth: 120, noRefs: true });
}

/**
 * Counts reported back to the caller after an import
 */
export interface ImportSummary {
  appsAdded: number;
  appsPresent: number;
  appsFailed: number;
  historyAdded: number;
  historyUpdated: number;
  historySkipped: number;
  /** Rows from the file that were older than everything History keeps */
  historyTooOld: number;
  /** Apps the import showed or hid, counting only real changes */
  appsShown: number;
  appsHidden: number;
  /** The file's version, when it isn't one this version of @ Profile writes */
  unknownVersion?: string;
  firstError?: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toText(value: unknown): string {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Import settings from YAML format.
 *
 * Order matters: custom apps first, so usage history can reference them; then visibility, merged
 * into the existing settings rather than replacing them; then history, merged by profile + app with
 * the file's timestamps kept. History for an app that exists neither as a default nor as a custom
 * app is skipped instead of inventing a placeholder app for it.
 */
export function importSettingsFromYAML(yamlContent: string): Promise<ImportSummary> {
  // One lock for the whole import, so another command can't write between its apps, settings and History
  return withStorageLock(() => importLocked(yamlContent));
}

async function importLocked(yamlContent: string): Promise<ImportSummary> {
  const settings = yaml.load(yamlContent) as Partial<YAMLSettings> | null;

  if (!settings || typeof settings !== "object") {
    throw new Error("This file isn't an @ Profile export");
  }
  if (!settings.version) {
    throw new Error("Missing version field: this file isn't an @ Profile export");
  }

  const summary: ImportSummary = {
    appsAdded: 0,
    appsPresent: 0,
    appsFailed: 0,
    historyAdded: 0,
    historyUpdated: 0,
    historySkipped: 0,
    historyTooOld: 0,
    appsShown: 0,
    appsHidden: 0,
    // A file from a newer @ Profile still imports, but fields this version doesn't know are dropped; say so
    // An unquoted `version: 1.0` reads as the number 1
    unknownVersion: ["1", "1.0"].includes(String(settings.version)) ? undefined : String(settings.version),
  };

  // 1. Custom apps
  const storedIdByFileValue = new Map<string, string>();
  const visibilityUpdates = new Map<string, boolean>();

  if (Array.isArray(settings.customApps)) {
    for (const app of settings.customApps) {
      const label = isNonEmptyString(app?.name) ? app.name : "(unnamed app)";
      if (!app || typeof app !== "object" || !isNonEmptyString(app.name) || !isNonEmptyString(app.urlTemplate)) {
        summary.appsFailed++;
        summary.firstError ??= `Skipped "${label}": a custom app needs a name and a URL template`;
        continue;
      }
      const appWithLegacy = app as typeof app & { enabled?: boolean };
      const visible =
        typeof app.visible === "boolean"
          ? app.visible
          : typeof appWithLegacy.enabled === "boolean"
            ? appWithLegacy.enabled
            : true;

      const result = await importCustomApp({ name: app.name, urlTemplate: app.urlTemplate });
      if (result.status === "invalid") {
        summary.appsFailed++;
        summary.firstError ??= `Couldn't import "${label}": ${result.error}`;
        continue;
      }
      if (result.status === "added") summary.appsAdded++;
      else summary.appsPresent++;

      if (isNonEmptyString(app.value)) storedIdByFileValue.set(app.value, result.value);
      if (!isDefaultApp(result.value)) {
        visibilityUpdates.set(result.value, visible);
      }
    }
  }

  const toStoredId = (value: string) => storedIdByFileValue.get(value) ?? value;

  // 2. Visibility for default apps, merged over the stored settings
  if (settings.visible && typeof settings.visible === "object") {
    for (const [appValue, visible] of Object.entries(settings.visible)) {
      if (typeof visible !== "boolean") continue;
      const resolved = toStoredId(appValue);
      if (resolved !== appValue && isDefaultApp(resolved)) continue;
      visibilityUpdates.set(resolved, visible);
    }
  }
  const visibilityChanges = await mergeAppVisibility(visibilityUpdates);
  summary.appsShown = visibilityChanges.shown;
  summary.appsHidden = visibilityChanges.hidden;

  // 3. Usage history, keyed by profile + app. An imported entry replaces a stored one for the same pair, keeping
  // the larger open count; when the file holds the same pair twice (e.g. "Alice" and "alice"), the newer wins.
  if (Array.isArray(settings.usageHistory)) {
    const knownApps = new Map((await getAppEntries()).map((entry) => [entry.value, entry.name]));
    const stored = new Map<string, UsageHistoryItem>();
    const fromFile = new Map<string, UsageHistoryItem>();

    // Stored history can hold case variants of one pair ("alice", "ALICE"); keep the most recent visit
    for (const item of await getUsageHistory()) {
      const key = getHistoryPairKey(item.profile, item.app);
      const previous = stored.get(key);
      if (!previous || item.timestamp > previous.timestamp) stored.set(key, item);
    }

    for (const item of settings.usageHistory) {
      if (!item || typeof item !== "object") {
        summary.historySkipped++;
        continue;
      }

      // YAML reads an unquoted 12345 as a number, so accept numbers for the text fields and store strings
      const profile = toText(item.profile);
      const app = toText(item.app);
      const appName = toText(item.appName);
      // A row without its timestamp is incomplete; inventing "now" would let it displace real visits
      if (!profile || !app || !appName || !isValidTimestamp(item.timestamp)) {
        summary.historySkipped++;
        continue;
      }

      const appValue = toStoredId(app);
      const knownName = knownApps.get(appValue);
      if (!knownName) {
        summary.historySkipped++;
        continue;
      }

      const count = toOpenCount(item.count);
      const key = getHistoryPairKey(profile, appValue);
      const previous = fromFile.get(key);
      if (previous && previous.timestamp >= item.timestamp) {
        previous.count = Math.max(previous.count, count);
        continue;
      }

      fromFile.set(key, {
        profile,
        app: appValue,
        appName: appValue === app ? appName : knownName,
        timestamp: item.timestamp,
        count: Math.max(count, previous?.count ?? 0),
      });
    }

    const merged = new Map(stored);
    for (const [key, entry] of fromFile) {
      merged.set(key, { ...entry, count: Math.max(entry.count, stored.get(key)?.count ?? 0) });
    }
    const kept = sortHistory(Array.from(merged.values())).slice(0, MAX_HISTORY_ITEMS);
    const keptKeys = new Set(kept.map((item) => getHistoryPairKey(item.profile, item.app)));

    // Count against what is actually kept, so a row the cap drops isn't reported as added
    for (const [key, entry] of fromFile) {
      const existing = stored.get(key);
      const next = merged.get(key) ?? entry;
      if (!keptKeys.has(key)) {
        if (!existing) summary.historyTooOld++;
      } else if (!existing) {
        summary.historyAdded++;
      } else if (
        existing.timestamp !== next.timestamp ||
        existing.count !== next.count ||
        existing.profile !== next.profile
      ) {
        summary.historyUpdated++;
      }
    }

    await setUsageHistory(kept);
  }

  return summary;
}

/**
 * One-line description of an import, for a toast message.
 * e.g. "1 app added (2 already set up) · 19 profiles added to History"
 */
export function describeImportSummary(summary: ImportSummary): string {
  let apps = summary.appsAdded === 0 ? "No apps added" : `${countOf(summary.appsAdded, "app")} added`;
  if (summary.appsPresent > 0) apps += ` (${summary.appsPresent} already set up)`;
  if (summary.appsFailed > 0) apps += `, ${summary.appsFailed} rejected`;

  const historyChanges: string[] = [];
  if (summary.historyAdded > 0) historyChanges.push(`${countOf(summary.historyAdded, "profile")} added to History`);
  if (summary.historyUpdated > 0) {
    historyChanges.push(
      summary.historyAdded > 0
        ? `${summary.historyUpdated} updated`
        : `${countOf(summary.historyUpdated, "History profile")} updated`,
    );
  }
  let history = historyChanges.length > 0 ? historyChanges.join(", ") : "History unchanged";
  const notKept: string[] = [];
  if (summary.historySkipped > 0) notKept.push(`${summary.historySkipped} skipped`);
  if (summary.historyTooOld > 0) notKept.push(`${summary.historyTooOld} older than the ${MAX_HISTORY_ITEMS} kept`);
  if (notKept.length > 0) history += ` (${notKept.join(", ")})`;

  const visibility: string[] = [];
  if (summary.appsHidden > 0) visibility.push(`${countOf(summary.appsHidden, "app")} hidden`);
  if (summary.appsShown > 0) {
    visibility.push(
      summary.appsHidden > 0 ? `${summary.appsShown} shown` : `${countOf(summary.appsShown, "app")} shown`,
    );
  }

  const description = [apps, visibility.join(", "), history].filter(Boolean).join(" · ");
  return summary.unknownVersion ? `${description} · From a newer version: some settings may not import` : description;
}

/**
 * The Export Directory preference, defaulting to ~/Downloads
 */
function getExportDirectory(): string {
  const { exportDirectory } = getPreferenceValues<Preferences>();
  if (!exportDirectory?.trim()) return join(homedir(), "Downloads");
  return exportDirectory.replace(/^~(?=$|\/)/, homedir());
}

/**
 * Export settings to a YAML file in the export directory. An existing file is never replaced: like the Finder,
 * the next free name gets a number ("… 2.yaml").
 */
export async function exportSettingsToFile(filename?: string): Promise<string> {
  const yamlContent = await exportSettingsToYAML();
  const defaultFilename = `at-profile-settings-${new Date().toISOString().split("T")[0]}.yaml`;

  const fileName = filename ? validateAndSanitizeFilename(filename) : defaultFilename;
  const directory = getExportDirectory();
  await mkdir(directory, { recursive: true });

  const extension = extname(fileName);
  const base = fileName.slice(0, fileName.length - extension.length);
  for (let copy = 1; ; copy++) {
    const filePath = join(directory, copy === 1 ? fileName : `${base} ${copy}${extension}`);
    validatePathInDirectory(filePath, directory);
    try {
      // "wx" fails instead of overwriting, without the race an existsSync check would have
      await writeFile(filePath, yamlContent, { encoding: "utf8", flag: "wx" });
      return filePath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
    }
  }
}

/**
 * Import settings from a YAML file
 */
export async function importSettingsFromFile(filePath: string): Promise<ImportSummary> {
  return importSettingsFromYAML(readFileSync(filePath, "utf8"));
}

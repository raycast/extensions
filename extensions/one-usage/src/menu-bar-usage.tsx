import { Cache, Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { PROVIDER_META, fetchAllProviders, getEnabledProviderIds, isProviderEnabled } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";
import {
  formatProgressValue,
  getPrimaryPercentage,
  getProviderOrder,
  getSelectedMenuBarProvider,
  reorderProviders,
} from "./utils";

const cache = new Cache();
const LAST_FETCH_KEY = "menu-bar-last-fetch";
const CACHED_DATA_KEY = "menu-bar-cached-data";
const CACHED_PROVIDERS_KEY = "menu-bar-cached-providers";

const INTERVAL_MS: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

function getRefreshIntervalMs(interval?: string): number {
  return INTERVAL_MS[interval ?? "5m"] ?? INTERVAL_MS["5m"];
}

async function fetchWithThrottle(): Promise<ProviderResult[]> {
  const prefs = getPreferenceValues<Preferences.MenuBarUsage>();
  const intervalMs = getRefreshIntervalMs(prefs.refreshInterval);
  const now = Date.now();

  const currentProviders = getEnabledProviderIds().join(",");
  const cachedProviders = cache.get(CACHED_PROVIDERS_KEY);
  const providersChanged = cachedProviders !== currentProviders;

  if (!providersChanged) {
    const lastFetchStr = cache.get(LAST_FETCH_KEY);
    if (lastFetchStr) {
      const elapsed = now - parseInt(lastFetchStr, 10);
      if (elapsed < intervalMs) {
        const cachedData = cache.get(CACHED_DATA_KEY);
        if (cachedData) {
          try {
            return JSON.parse(cachedData) as ProviderResult[];
          } catch {
            // No actions
          }
        }
      }
    }
  }

  const results = await fetchAllProviders();
  cache.set(LAST_FETCH_KEY, String(now));
  cache.set(CACHED_DATA_KEY, JSON.stringify(results));
  cache.set(CACHED_PROVIDERS_KEY, currentProviders);
  return results;
}

function buildMenuBarTitle(results: ProviderResult[], selectedProvider: string): string {
  const filtered = selectedProvider === "all" ? results : results.filter((r) => r.id === selectedProvider);

  const parts: string[] = [];
  for (const result of filtered) {
    if (!result.lines) continue;
    const pct = getPrimaryPercentage(result.lines);
    if (pct === undefined) continue;

    const rounded = `${Math.round(pct)}%`;
    parts.push(selectedProvider === "all" ? `${result.name.charAt(0)}:${rounded}` : rounded);
  }
  return parts.length > 0 ? parts.join(" ") : "Usage";
}

/** Format a MetricLine for display in the menu bar dropdown. */
function formatMenuBarLine(line: MetricLine): string {
  switch (line.type) {
    case "badge":
      return `${line.label}: ${line.text}`;
    case "progress": {
      const value = formatProgressValue(line.value, line.max, line.unit);
      const subtitle = line.subtitle ? `  ·  ${line.subtitle}` : "";
      return `${line.label}: ${value}${subtitle}`;
    }
    case "text":
      return `${line.label}: ${line.value}`;
  }
}

export default function MenuBarUsage() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchWithThrottle, [], {
    keepPreviousData: true,
  });

  const orderedData = data ? reorderProviders(data, getProviderOrder()) : undefined;

  const rawProvider = getSelectedMenuBarProvider() ?? "all";
  const selectedProvider = rawProvider !== "all" && !isProviderEnabled(rawProvider) ? "all" : rawProvider;
  const title = orderedData && orderedData.length > 0 ? buildMenuBarTitle(orderedData, selectedProvider) : "Usage";

  const menuBarIcon =
    selectedProvider !== "all" && PROVIDER_META[selectedProvider]
      ? PROVIDER_META[selectedProvider].icon
      : "extension-icon.png";

  return (
    <MenuBarExtra icon={menuBarIcon} title={title} isLoading={isLoading}>
      {orderedData?.map((result) => (
        <MenuBarExtra.Section title={result.name} key={result.id}>
          {result.error ? (
            <MenuBarExtra.Item title={`⚠️ ${result.error}`} />
          ) : (
            result.lines?.map((line, i) => (
              <MenuBarExtra.Item
                key={`${line.type}-${line.label}-${i}`}
                icon={PROVIDER_META[result.id]?.icon}
                title={formatMenuBarLine(line)}
                onAction={() => {}}
              />
            ))
          )}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            cache.remove(LAST_FETCH_KEY);
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          title="Preferences…"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

import { getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { fetchAllProviders, isProviderEnabled, PROVIDER_META } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";
import { fetchFromCacheOrNetwork, getLastUpdatedFormatted, writeCache } from "./usage-cache";
import {
  formatProgressValue,
  getPrimaryPercentage,
  getProviderOrder,
  getSelectedMenuBarProvider,
  reorderProviders,
} from "./utils";

const buildMenuBarTitle = (results: ProviderResult[], selectedProvider: string): string => {
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
};

/** Format a MetricLine for display in the menu bar dropdown. */
const formatMenuBarLine = (line: MetricLine): string => {
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
};

const getRefreshIntervalMs = (): number => {
  const prefs = getPreferenceValues<{ refreshInterval?: string }>();
  const v = prefs.refreshInterval ?? "5m";
  switch (v) {
    case "15m":
      return 15 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    default:
      return 5 * 60 * 1000;
  }
};

const MenuBarUsage = () => {
  const { data, isLoading, revalidate } = useCachedPromise(fetchFromCacheOrNetwork, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    const ms = getRefreshIntervalMs();
    const id = setInterval(async () => {
      const results = await fetchAllProviders();
      writeCache(results);
      revalidate();
    }, ms);
    return () => clearInterval(id);
  }, [revalidate]);

  const orderedData = data ? reorderProviders(data, getProviderOrder()) : undefined;

  const rawProvider = getSelectedMenuBarProvider() ?? orderedData?.[0]?.id ?? "all";
  const selectedProvider =
    rawProvider !== "all" && !isProviderEnabled(rawProvider) ? (orderedData?.[0]?.id ?? "all") : rawProvider;
  const title = orderedData && orderedData.length > 0 ? buildMenuBarTitle(orderedData, selectedProvider) : "Usage";

  const menuBarIcon =
    selectedProvider !== "all" && PROVIDER_META[selectedProvider]
      ? PROVIDER_META[selectedProvider].icon
      : "extension-icon.png";

  // In dropdown, only show pinned provider when one is selected; otherwise show all
  const displayData = selectedProvider === "all" ? orderedData : orderedData?.filter((r) => r.id === selectedProvider);

  const lastUpdatedAt = getLastUpdatedFormatted();

  return (
    <MenuBarExtra icon={menuBarIcon} title={title} isLoading={isLoading}>
      {displayData?.map((result) => (
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
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title={`Last Updated: ${lastUpdatedAt || ""}`} icon={Icon.Clock} onAction={() => {}} />
          </MenuBarExtra.Section>
          {PROVIDER_META[result.id] && (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item
                title="Usage Dashboard"
                icon={Icon.Globe}
                onAction={() => open(PROVIDER_META[result.id].usageUrl)}
              />
              <MenuBarExtra.Item
                title="Status Page"
                icon={Icon.Cog}
                onAction={() => open(PROVIDER_META[result.id].statusUrl)}
              />
            </MenuBarExtra.Section>
          )}
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra>
  );
};

export default MenuBarUsage;

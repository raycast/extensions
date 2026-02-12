import { getPreferenceValues, Icon, Image, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect } from "react";
import { isProviderEnabled, PROVIDER_META } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";
import { clearCache, fetchFromCacheOrNetwork, getLastFetchKey, getLastUpdatedFormatted } from "./usage-cache";
import {
  formatProgressValue,
  getPrimaryPercentage,
  getProviderOrder,
  getSelectedMenuBarProvider,
  reorderProviders,
} from "./utils";

const DEFAULT_TITLE = "Usage";
const DEFAULT_ICON = "extension-icon.png";
const MIN_REFRESH_MS = 60 * 1000;

const buildMenuBarTitle = (results: ProviderResult[], selectedProvider: string): string => {
  const filtered = selectedProvider === "all" ? results : results.filter((r) => r.id === selectedProvider);
  const parts = filtered
    .map((result) => {
      if (!result.lines) return null;
      const pct = getPrimaryPercentage(result.lines);
      if (pct === undefined) return null;
      return selectedProvider === "all" ? "Usage" : `${Math.round(pct)}%`;
    })
    .filter((s): s is string => s !== null);
  return parts.length > 0 ? parts.join(" ") : DEFAULT_TITLE;
};

/** Parse refresh interval preference (e.g. "1m", "30m") to milliseconds. */
const refreshIntervalToMs = (value: string): number => {
  const match = value.match(/^(\d+)m$/);
  if (!match) return MIN_REFRESH_MS;
  return Math.max(MIN_REFRESH_MS, parseInt(match[1], 10) * 60 * 1000);
};

/** Resolve the effective menu bar provider (handles disabled provider fallback). */
const resolveSelectedProvider = (
  orderedData: ProviderResult[] | undefined,
  rawProvider: string | undefined,
): string => {
  const fallback = orderedData?.[0]?.id ?? "all";
  if (!rawProvider || rawProvider === "all") return "all";
  return isProviderEnabled(rawProvider) ? rawProvider : fallback;
};

/** Icon for the menu bar: provider icon when one is selected, else default. */
const getMenuBarIcon = (selectedProvider: string): Image.ImageLike => {
  if (selectedProvider === "all") return DEFAULT_ICON;
  return PROVIDER_META[selectedProvider]?.icon ?? DEFAULT_ICON;
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

interface ProviderMenuSectionProps {
  result: ProviderResult;
  lastUpdatedAt: string | null;
}

const ProviderMenuSection = ({ result, lastUpdatedAt }: ProviderMenuSectionProps) => {
  const meta = PROVIDER_META[result.id];
  return (
    <MenuBarExtra.Section title={result.name}>
      {result.error ? (
        <MenuBarExtra.Item title={`⚠️ ${result.error}`} onAction={() => {}} />
      ) : (
        result.lines?.map((line, i) => (
          <MenuBarExtra.Item
            key={`${line.type}-${line.label}-${i}`}
            icon={meta?.icon}
            title={formatMenuBarLine(line)}
            onAction={() => {}}
          />
        ))
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`Last Updated: ${lastUpdatedAt ?? ""}`} icon={Icon.Clock} onAction={() => {}} />
      </MenuBarExtra.Section>
      {meta && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Usage Dashboard" icon={Icon.Globe} onAction={() => open(meta.usageUrl)} />
          <MenuBarExtra.Item title="Status Page" icon={Icon.Cog} onAction={() => open(meta.statusUrl)} />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra.Section>
  );
};

const MenuBarUsage = () => {
  const { refreshInterval } = getPreferenceValues<Preferences.MenuBarUsage>();
  const intervalMs = refreshIntervalToMs(refreshInterval);

  const { data, isLoading, revalidate } = useCachedPromise(fetchFromCacheOrNetwork, [], {
    keepPreviousData: true,
  });

  const handleRefresh = useCallback(() => {
    clearCache();
    revalidate();
  }, [revalidate]);

  useEffect(() => {
    const lastFetchKey = getLastFetchKey();
    const lastRefreshTime = lastFetchKey ? parseInt(lastFetchKey, 10) : 0;
    if (lastRefreshTime === 0 || Date.now() - lastRefreshTime > intervalMs) {
      handleRefresh();
    }
  }, [intervalMs, handleRefresh]);

  const orderedData = data ? reorderProviders(data, getProviderOrder()) : undefined;
  const rawProvider = getSelectedMenuBarProvider() ?? orderedData?.[0]?.id ?? "all";
  const selectedProvider = resolveSelectedProvider(orderedData, rawProvider);
  const title =
    orderedData && orderedData.length > 0 ? buildMenuBarTitle(orderedData, selectedProvider) : DEFAULT_TITLE;
  const displayData = selectedProvider === "all" ? orderedData : orderedData?.filter((r) => r.id === selectedProvider);
  const lastUpdatedAt = getLastUpdatedFormatted();

  return (
    <MenuBarExtra icon={getMenuBarIcon(selectedProvider)} title={title} isLoading={isLoading}>
      {displayData?.map((result) => (
        <ProviderMenuSection result={result} lastUpdatedAt={lastUpdatedAt} key={result.id} />
      ))}
    </MenuBarExtra>
  );
};

export default MenuBarUsage;

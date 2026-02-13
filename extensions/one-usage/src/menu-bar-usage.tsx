import { getPreferenceValues, Icon, Image, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { formatProgressValue, getPrimaryPercentage } from "./format";
import {
  getProviderOrder,
  getSelectedMenuBarProvider,
  hydratePreferencesFromStorage,
  reorderProviders,
} from "./preferences";
import { isProviderEnabled, PROVIDER_META } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";
import { clearCache, fetchFromCacheOrNetwork, getLastFetchKey, getLastUpdatedFormatted } from "./usage-cache";

const DEFAULT_TITLE = "Usage";
const DEFAULT_ICON = "extension-icon.png";
const MIN_REFRESH_MS = 60 * 1000;

const buildMenuBarTitle = (results: ProviderResult[], selectedProvider: string): string => {
  if (selectedProvider === "all") return DEFAULT_TITLE;
  const result = results.find((r) => r.id === selectedProvider);
  if (!result?.lines) return DEFAULT_TITLE;
  const pct = getPrimaryPercentage(result.lines);
  return pct !== undefined ? `${Math.round(pct)}%` : DEFAULT_TITLE;
};

const refreshIntervalToMs = (value: string): number => {
  const match = value.match(/^(\d+)m$/);
  if (!match) return MIN_REFRESH_MS;
  return Math.max(MIN_REFRESH_MS, parseInt(match[1], 10) * 60 * 1000);
};

const resolveSelectedProvider = (orderedData: ProviderResult[] | undefined): string => {
  const stored = getSelectedMenuBarProvider();
  if (stored === "all") return "all";
  if (stored && isProviderEnabled(stored)) return stored;
  return orderedData?.[0]?.id ?? "all";
};

const getMenuBarIcon = (selectedProvider: string): Image.ImageLike => {
  if (selectedProvider === "all") return DEFAULT_ICON;
  return PROVIDER_META[selectedProvider]?.icon ?? DEFAULT_ICON;
};

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

const ProviderMenuSection = ({ result, lastUpdatedAt }: { result: ProviderResult; lastUpdatedAt: string | null }) => {
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

  const [hydrated, setHydrated] = useState(false);

  const handleRefresh = useCallback(() => {
    clearCache();
    revalidate();
  }, [revalidate]);

  useEffect(() => {
    hydratePreferencesFromStorage().then(() => setHydrated(true));
  }, []);

  useEffect(() => {
    const raw = getLastFetchKey();
    const lastFetchMs = raw ? parseInt(raw, 10) : NaN;
    if (isNaN(lastFetchMs) || Date.now() - lastFetchMs > intervalMs) {
      handleRefresh();
    }
  }, [intervalMs, handleRefresh]);

  if (!hydrated) {
    return <MenuBarExtra icon={DEFAULT_ICON} title={DEFAULT_TITLE} isLoading={true} />;
  }

  const orderedData = data ? reorderProviders(data, getProviderOrder()) : undefined;
  const selectedProvider = resolveSelectedProvider(orderedData);
  const title = orderedData?.length ? buildMenuBarTitle(orderedData, selectedProvider) : DEFAULT_TITLE;
  const displayData = selectedProvider === "all" ? null : orderedData?.find((r) => r.id === selectedProvider);

  return (
    <MenuBarExtra icon={getMenuBarIcon(selectedProvider)} title={title} isLoading={isLoading}>
      {displayData && <ProviderMenuSection result={displayData} lastUpdatedAt={getLastUpdatedFormatted()} />}
    </MenuBarExtra>
  );
};

export default MenuBarUsage;

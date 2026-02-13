import { getPreferenceValues, Icon, Image, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { formatLastUpdatedAt, formatProgressValue, getPrimaryPercentage } from "./format";
import { useLocalUsage } from "./hooks/use-local-usage";
import { fetchAllProviders, isProviderEnabled, PROVIDER_META } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";
import { reorderProviders } from "./util";

const DEFAULT_TITLE = "Usage";
const DEFAULT_ICON = "extension-icon.png";
const MIN_REFRESH_MS = 60 * 1000;

const formatMenuBarTitle = (results: ProviderResult[], selectedProvider: string): string => {
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

const getSelectedProvider = (provider: string | undefined, orderedData: ProviderResult[] | undefined): string => {
  if (provider && isProviderEnabled(provider)) return provider;
  if (provider && !isProviderEnabled(provider)) return "all";
  return orderedData?.[0]?.id ?? "all";
};

const getMenuBarIcon = (provider: string): Image.ImageLike => {
  if (provider === "all") return DEFAULT_ICON;
  return PROVIDER_META[provider]?.icon ?? DEFAULT_ICON;
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

  const {
    isLoading: isLoadingLocalUsage,
    providerOrder,
    selectedProvider,
    lastUpdatedMs,
    setLastUpdatedMs,
  } = useLocalUsage();

  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const results = await fetchAllProviders();
      setLastUpdatedMs(Date.now());
      return results;
    },
    [],
    { keepPreviousData: true, execute: false },
  );

  useEffect(() => {
    if (isLoadingLocalUsage) return;
    if (lastUpdatedMs == null || Date.now() - lastUpdatedMs > intervalMs) {
      revalidate();
    }
  }, [intervalMs, isLoadingLocalUsage, lastUpdatedMs]);

  if (isLoadingLocalUsage) {
    return <MenuBarExtra icon={DEFAULT_ICON} title={DEFAULT_TITLE} isLoading />;
  }

  const orderedData = data ? reorderProviders(data, providerOrder) : undefined;
  const provider = getSelectedProvider(selectedProvider, orderedData);
  const icon = getMenuBarIcon(provider);
  const title = orderedData?.length ? formatMenuBarTitle(orderedData, provider) : DEFAULT_TITLE;
  const displayData = selectedProvider === "all" ? null : orderedData?.find((r) => r.id === selectedProvider);

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading}>
      {displayData && (
        <ProviderMenuSection result={displayData} lastUpdatedAt={formatLastUpdatedAt(lastUpdatedMs ?? 0)} />
      )}
    </MenuBarExtra>
  );
};

export default MenuBarUsage;

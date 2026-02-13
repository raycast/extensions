import { getPreferenceValues, Icon, Image, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { DEFAULT_ICON, DEFAULT_TITLE } from "./constants";
import { formatLastUpdatedAt, formatProgressValue, getPrimaryPercentage } from "./format";
import { useLocalUsage } from "./hooks/use-local-usage";
import { fetchAllProviders, PROVIDER_META } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";

const MIN_REFRESH_MS = 60 * 1000;

const formatMenuBarTitle = (results: ProviderResult[], selectedProvider: string): string => {
  if (selectedProvider === "all") return DEFAULT_TITLE;
  const result = results?.find((r) => r.id === selectedProvider);
  if (!result?.lines) return DEFAULT_TITLE;
  const pct = getPrimaryPercentage(result.lines);
  return pct !== undefined ? `${Math.round(pct)}%` : DEFAULT_TITLE;
};

const getMenuBarIcon = (provider: string): Image.ImageLike => {
  if (provider === "all") return DEFAULT_ICON;
  return PROVIDER_META[provider]?.icon ?? DEFAULT_ICON;
};

const refreshIntervalToMs = (value: string): number => {
  const match = value.match(/^(\d+)m$/);
  if (!match) return MIN_REFRESH_MS;
  return Math.max(MIN_REFRESH_MS, parseInt(match[1], 10) * 60 * 1000);
};

const formatMenuBarLine = (line: MetricLine): string => {
  switch (line.type) {
    case "badge":
      return `${line.label}: ${line.text}`;
    case "progress": {
      const value = formatProgressValue(line.value, line.unit);
      const subtitle = line.subtitle ? `  ·  ${line.subtitle}` : "";
      return `${line.label}: ${value}${subtitle}`;
    }
    case "text":
      return `${line.label}: ${line.value}`;
  }
};

interface ProviderMenuSectionProps {
  provider: ProviderResult;
  lastUpdated: number | null;
}

const ProviderMenuSection: React.FC<ProviderMenuSectionProps> = ({ provider, lastUpdated }) => {
  const meta = PROVIDER_META[provider.id];
  const lastUpdatedAtText = formatLastUpdatedAt(lastUpdated);

  return (
    <MenuBarExtra.Section title={provider.name}>
      {provider.error ? (
        <MenuBarExtra.Item title={`⚠️ ${provider.error}`} onAction={() => {}} />
      ) : (
        provider.lines?.map((line, i) => (
          <MenuBarExtra.Item
            key={`${line.type}-${line.label}-${i}`}
            icon={meta?.icon}
            title={formatMenuBarLine(line)}
            onAction={() => {}}
          />
        ))
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`Last Updated: ${lastUpdatedAtText}`} icon={Icon.Clock} onAction={() => {}} />
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

const MenuBarUsage: React.FC = () => {
  const { refreshInterval } = getPreferenceValues<Preferences.MenuBarUsage>();
  const { isLoading: isLoadingLocalUsage, selectedProvider, lastUpdated, setLastUpdated } = useLocalUsage();

  const {
    data = [],
    isLoading: isLoadingProviders,
    revalidate,
  } = useCachedPromise(
    async () => {
      const results = await fetchAllProviders();
      setLastUpdated(Date.now());
      return results;
    },
    [],
    { keepPreviousData: true, execute: false },
  );

  useEffect(() => {
    if (isLoadingLocalUsage) return;
    const intervalMs = refreshIntervalToMs(refreshInterval);
    if (lastUpdated == null || Date.now() - lastUpdated > intervalMs) {
      revalidate();
    }
  }, [isLoadingLocalUsage]);

  const icon = isLoadingLocalUsage ? DEFAULT_ICON : getMenuBarIcon(selectedProvider);
  const title = isLoadingLocalUsage ? DEFAULT_TITLE : formatMenuBarTitle(data, selectedProvider);
  const provider = isLoadingLocalUsage ? null : data.find((r) => r.id === selectedProvider);
  const isLoading = isLoadingLocalUsage || isLoadingProviders;

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading}>
      {provider && <ProviderMenuSection provider={provider} lastUpdated={lastUpdated} />}
    </MenuBarExtra>
  );
};

export default MenuBarUsage;

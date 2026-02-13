/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { formatProgressBar, formatProgressValue } from "./format";
import {
  getProviderOrder,
  getSelectedMenuBarProvider,
  hydratePreferencesFromStorage,
  reorderProviders,
  setProviderOrder,
  setSelectedMenuBarProvider,
} from "./preferences";
import { PROVIDER_META } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";
import { clearCache, fetchFromCacheOrNetwork, getLastUpdatedFormatted } from "./usage-cache";

const getProviderIcon = (providerId: string): Image.ImageLike =>
  PROVIDER_META[providerId]?.icon ?? { source: Icon.Info, tintColor: Color.PrimaryText };

const lineToDisplayValue = (line: MetricLine): string => {
  switch (line.type) {
    case "text":
      return line.value;
    case "badge":
      return line.text;
    case "progress": {
      const pct = line.max > 0 ? Math.round((line.value / line.max) * 100) : 0;
      const valueText = formatProgressValue(line.value, line.max, line.unit);
      const bar = formatProgressBar(pct);
      return `${bar} ${valueText}${line.unit === "percent" ? "" : ` / $${line.max.toFixed(2)}`}`;
    }
  }
};

const getDetailMeta = (result: ProviderResult): { label: string; value: string }[] => {
  if (result.error) return [{ label: "Error", value: result.error }];
  if (!result.lines?.length) return [];
  const meta = result.lines.map((line) => ({ label: line.label, value: lineToDisplayValue(line) }));
  const resetSubtitle = result.lines.find((l) => l.subtitle)?.subtitle;
  if (resetSubtitle) meta.push({ label: "Resets", value: resetSubtitle });
  return meta;
};

type ReorderAction = "top" | "up" | "down";

const applyReorder = (orderedIds: string[], providerId: string, action: ReorderAction): string[] | null => {
  const index = orderedIds.indexOf(providerId);
  if (index < 0) return null;
  const next = [...orderedIds];
  if (action === "top") {
    if (index <= 0) return null;
    next.splice(index, 1);
    next.unshift(providerId);
    return next;
  }
  if (action === "up" && index > 0) {
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    return next;
  }
  if (action === "down" && index < next.length - 1) {
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    return next;
  }
  return null;
};

interface ProviderActionsProps {
  providerId: string;
  providerName: string;
  currentMenuBarProvider: string | undefined;
  orderedIds: string[];
  onRefresh: () => void;
  onSetMenuBarProvider: (providerId: string) => void;
  onReorder: (newOrder: string[]) => void;
}

const ProviderActions = ({
  providerId,
  providerName,
  currentMenuBarProvider,
  orderedIds,
  onRefresh,
  onSetMenuBarProvider,
  onReorder,
}: ProviderActionsProps) => {
  const meta = PROVIDER_META[providerId];
  const isPinned = currentMenuBarProvider === providerId;
  const index = orderedIds.indexOf(providerId);
  const canMoveUp = index > 0;
  const canMoveDown = index >= 0 && index < orderedIds.length - 1;

  const handleReorder = (action: ReorderAction) => {
    const next = applyReorder(orderedIds, providerId, action);
    if (!next) return;
    onReorder(next);
    const titles: Record<ReorderAction, string> = {
      top: `Moved ${providerName} to top`,
      up: `Moved ${providerName} up`,
      down: `Moved ${providerName} down`,
    };
    showToast({ style: Toast.Style.Success, title: titles[action] });
  };

  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      {meta && (
        <>
          <Action.OpenInBrowser title="Usage Dashboard" url={meta.usageUrl} />
          <Action.OpenInBrowser title="Status Page" url={meta.statusUrl} />
        </>
      )}
      <ActionPanel.Section title="Order">
        {canMoveUp && (
          <Action
            title="Move to Top"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() => handleReorder("top")}
          />
        )}
        {canMoveUp && (
          <Action
            title="Move Up"
            icon={Icon.ChevronUp}
            shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
            onAction={() => handleReorder("up")}
          />
        )}
        {canMoveDown && (
          <Action
            title="Move Down"
            icon={Icon.ChevronDown}
            shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
            onAction={() => handleReorder("down")}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Menu Bar">
        {!isPinned && (
          <Action
            title="Pin to Menu Bar"
            icon={Icon.Pin}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => onSetMenuBarProvider(providerId)}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
};

const ProviderDetail = ({ result, lastUpdatedText }: { result: ProviderResult; lastUpdatedText: string | null }) => {
  const meta = PROVIDER_META[result.id];
  const detailMeta = getDetailMeta(result);
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={result.name} />
          {detailMeta.map(({ label, value }, i) => (
            <List.Item.Detail.Metadata.Label key={`${label}-${i}`} title={label} text={value} />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Last Updated" text={lastUpdatedText || ""} />
          {detailMeta.length > 0 && meta ? <List.Item.Detail.Metadata.Separator /> : null}
          {meta && (
            <>
              <List.Item.Detail.Metadata.Link title="Usage Dashboard" target={meta.usageUrl} text="View" />
              <List.Item.Detail.Metadata.Link title="Status Page" target={meta.statusUrl} text="View" />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const ViewUsage = () => {
  const { data, isLoading, revalidate } = useCachedPromise(fetchFromCacheOrNetwork, [], {
    keepPreviousData: true,
  });

  const handleRefresh = () => {
    clearCache();
    revalidate();
  };

  const [menuBarProvider, setMenuBarProvider] = useState<string | undefined>(getSelectedMenuBarProvider);
  const [providerOrder, setProviderOrderState] = useState<string[] | undefined>(getProviderOrder);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydratePreferencesFromStorage().then(() => {
      setMenuBarProvider(getSelectedMenuBarProvider());
      setProviderOrderState(getProviderOrder());
      setHydrated(true);
      handleRefresh();
    });
  }, []);

  const orderedData = useMemo(() => reorderProviders(data, providerOrder), [data, providerOrder]);
  const orderedIds = useMemo(() => orderedData.map((r) => r.id), [orderedData]);
  const effectiveMenuBarProvider = menuBarProvider ?? orderedIds[0];
  const lastUpdatedText = getLastUpdatedFormatted();

  const handleSetMenuBarProvider = (providerId: string) => {
    setSelectedMenuBarProvider(providerId);
    setMenuBarProvider(providerId);
    const label = providerId === "all" ? "All Providers" : (PROVIDER_META[providerId]?.name ?? providerId);
    showToast({ style: Toast.Style.Success, title: `Menu Bar → ${label}` });
  };

  const handleReorder = (newOrder: string[]) => {
    setProviderOrder(newOrder);
    setProviderOrderState(newOrder);
  };

  return (
    <List isLoading={isLoading || !hydrated} isShowingDetail>
      {hydrated && data && data.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Providers Enabled"
          description="Enable at least one provider in the extension preferences."
          icon={Icon.Gear}
        />
      )}
      {hydrated &&
        orderedData.map((result) => (
          <List.Item
            key={result.id}
            title={result.name}
            icon={result.error ? { source: Icon.ExclamationMark, tintColor: Color.Red } : getProviderIcon(result.id)}
            accessories={
              effectiveMenuBarProvider === result.id ? [{ tag: { value: "Selected", color: Color.Blue } }] : []
            }
            detail={<ProviderDetail result={result} lastUpdatedText={lastUpdatedText} />}
            actions={
              <ProviderActions
                providerId={result.id}
                providerName={result.name}
                currentMenuBarProvider={menuBarProvider}
                orderedIds={orderedIds}
                onRefresh={handleRefresh}
                onSetMenuBarProvider={handleSetMenuBarProvider}
                onReorder={handleReorder}
              />
            }
          />
        ))}
    </List>
  );
};

export default ViewUsage;

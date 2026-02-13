/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { DEFAULT_TITLE } from "./constants";
import { formatLastUpdatedAt, formatProgressBar, formatProgressValue } from "./format";
import { useLocalUsage } from "./hooks/use-local-usage";
import { fetchAllProviders, PROVIDER_META } from "./providers/registry";
import { MetricLine, ProviderResult } from "./types";
import { reorderProviders } from "./util";

const getProviderIcon = (providerId: string): Image.ImageLike => {
  return PROVIDER_META[providerId]?.icon ?? { source: Icon.Info, tintColor: Color.PrimaryText };
};

const getProviderTitle = (providerId: string): string => {
  if (providerId === "all") return DEFAULT_TITLE;
  return PROVIDER_META[providerId]?.name ?? providerId;
};

const lineToDisplayValue = (line: MetricLine): string => {
  switch (line.type) {
    case "text":
      return line.value;
    case "badge":
      return line.text;
    case "progress": {
      const pct = line.max > 0 ? Math.round((line.value / line.max) * 100) : 0;
      const valueText = formatProgressValue(line.value, line.unit);
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
  selectedProvider: string | undefined;
  orderedIds: string[];
  onRefresh: () => void;
  onSetMenuBarProvider: (providerId: string) => void;
  onReorder: (newOrder: string[]) => void;
}

const ProviderActions: React.FC<ProviderActionsProps> = ({
  providerId,
  providerName,
  selectedProvider,
  orderedIds,
  onRefresh,
  onSetMenuBarProvider,
  onReorder,
}) => {
  const meta = PROVIDER_META[providerId];
  const isPinned = selectedProvider === providerId;
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

interface ProviderDetailProps {
  result: ProviderResult;
  lastUpdated: number | null;
}

const ProviderDetail: React.FC<ProviderDetailProps> = ({ result, lastUpdated }) => {
  const meta = PROVIDER_META[result.id];
  const detailMeta = getDetailMeta(result);
  const lastUpdatedAtText = formatLastUpdatedAt(lastUpdated);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={result.name} />
          {detailMeta.map(({ label, value }, i) => (
            <List.Item.Detail.Metadata.Label key={`${label}-${i}`} title={label} text={value} />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Last Updated" text={lastUpdatedAtText || ""} />
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

const ViewUsage: React.FC = () => {
  const { providerOrder, selectedProvider, lastUpdated, setLastUpdated, setSelectedProvider, setProviderOrder } =
    useLocalUsage();

  const {
    data = [],
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const results = await fetchAllProviders();
      setLastUpdated(Date.now());
      return results;
    },
    [],
    { keepPreviousData: true },
  );

  const orderedData = useMemo(() => reorderProviders(data, providerOrder), [data, providerOrder]);
  const orderedIds = useMemo(() => orderedData.map((r) => r.id), [orderedData]);

  const handleSetMenuBarProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    const title = getProviderTitle(providerId);
    showToast({ style: Toast.Style.Success, title: `Menu Bar → ${title}` });
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data && data.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Providers Enabled"
          description="Enable at least one provider in the extension preferences."
          icon={Icon.Gear}
        />
      )}
      {orderedData.map((result) => (
        <List.Item
          key={result.id}
          title={result.name}
          icon={result.error ? { source: Icon.ExclamationMark, tintColor: Color.Red } : getProviderIcon(result.id)}
          accessories={selectedProvider === result.id ? [{ tag: { value: "Selected", color: Color.Blue } }] : []}
          detail={<ProviderDetail result={result} lastUpdated={lastUpdated} />}
          actions={
            <ProviderActions
              providerId={result.id}
              providerName={result.name}
              selectedProvider={selectedProvider}
              orderedIds={orderedIds}
              onRefresh={revalidate}
              onSetMenuBarProvider={handleSetMenuBarProvider}
              onReorder={setProviderOrder}
            />
          }
        />
      ))}
    </List>
  );
};

export default ViewUsage;

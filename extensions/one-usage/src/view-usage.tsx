/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { PROVIDER_META } from "./providers/registry";
import { ProviderResult } from "./types";
import { clearCache, fetchFromCacheOrNetwork, getLastUpdatedFormatted } from "./usage-cache";
import {
  formatProgressBar,
  formatProgressValue,
  getProviderOrder,
  getSelectedMenuBarProvider,
  reorderProviders,
  setProviderOrder,
  setSelectedMenuBarProvider,
} from "./utils";

function getProviderIcon(providerId: string): Image.ImageLike {
  return PROVIDER_META[providerId]?.icon ?? { source: Icon.Info, tintColor: Color.PrimaryText };
}

/** Push "Resets" row once per result when a line has subtitle. */
function pushResetOnce(
  meta: { label: string; value: string }[],
  subtitle: string | undefined,
  resetAdded: { current: boolean },
): void {
  if (subtitle && !resetAdded.current) {
    meta.push({ label: "Resets", value: subtitle });
    resetAdded.current = true;
  }
}

/** All lines as label/value for detail metadata (no markdown). */
function getDetailMeta(result: ProviderResult): { label: string; value: string }[] {
  if (result.error) return [{ label: "Error", value: result.error }];
  if (!result.lines?.length) return [];
  const meta: { label: string; value: string }[] = [];
  const resetAdded = { current: false };
  for (const line of result.lines) {
    if (line.type === "text") {
      meta.push({ label: line.label, value: line.value });
      pushResetOnce(meta, line.subtitle, resetAdded);
    } else if (line.type === "badge") {
      meta.push({ label: line.label, value: line.text });
      pushResetOnce(meta, line.subtitle, resetAdded);
    } else if (line.type === "progress") {
      const pct = line.max > 0 ? Math.round((line.value / line.max) * 100) : 0;
      const valueText = formatProgressValue(line.value, line.max, line.unit);
      const bar = formatProgressBar(pct);
      meta.push({
        label: line.label,
        value: `${bar} ${valueText} / ${line.max}${line.unit === "percent" ? "%" : ""}`,
      });
      pushResetOnce(meta, line.subtitle, resetAdded);
    }
  }
  return meta;
}

type ReorderAction = "top" | "up" | "down";

/** Returns new order after reorder action, or null if action is not allowed. */
function applyReorder(orderedIds: string[], providerId: string, action: ReorderAction): string[] | null {
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
}

function ProviderActions(props: {
  providerId: string;
  providerName: string;
  currentMenuBarProvider: string | undefined;
  orderedIds: string[];
  onRefresh: () => void;
  onSetMenuBarProvider: (providerId: string) => void;
  onReorder: (newOrder: string[]) => void;
}) {
  const meta = PROVIDER_META[props.providerId];
  const isPinned = props.currentMenuBarProvider === props.providerId;
  const index = props.orderedIds.indexOf(props.providerId);
  const canMoveUp = index > 0;
  const canMoveDown = index >= 0 && index < props.orderedIds.length - 1;

  const titles: Record<ReorderAction, string> = {
    top: `Moved ${props.providerName} to top`,
    up: `Moved ${props.providerName} up`,
    down: `Moved ${props.providerName} down`,
  };

  function handleReorder(action: ReorderAction) {
    const next = applyReorder(props.orderedIds, props.providerId, action);
    if (next) {
      props.onReorder(next);
      showToast({ style: Toast.Style.Success, title: titles[action] });
    }
  }

  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={props.onRefresh} />
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
            onAction={() => props.onSetMenuBarProvider(props.providerId)}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function ViewUsage() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchFromCacheOrNetwork, [], {
    keepPreviousData: true,
  });

  function handleRefresh() {
    clearCache();
    revalidate();
  }
  const [menuBarProvider, setMenuBarProvider] = useState<string | undefined>(getSelectedMenuBarProvider);
  const [providerOrder, setProviderOrderState] = useState<string[] | undefined>(getProviderOrder);

  const orderedData = useMemo(() => reorderProviders(data, providerOrder), [data, providerOrder]);
  const orderedIds = useMemo(() => orderedData?.map((r) => r.id) ?? [], [orderedData]);
  const effectiveMenuBarProvider = menuBarProvider ?? orderedIds[0];

  const lastUpdatedText = getLastUpdatedFormatted();

  function handleSetMenuBarProvider(providerId: string) {
    setSelectedMenuBarProvider(providerId);
    setMenuBarProvider(providerId);
    const label = providerId === "all" ? "All Providers" : (PROVIDER_META[providerId]?.name ?? providerId);
    showToast({ style: Toast.Style.Success, title: `Menu Bar → ${label}` });
  }

  function handleReorder(newOrder: string[]) {
    setProviderOrder(newOrder);
    setProviderOrderState(newOrder);
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data && data.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Providers Enabled"
          description="Enable at least one provider in the extension preferences."
          icon={Icon.Gear}
        />
      )}
      {orderedData?.map((result) => {
        const meta = PROVIDER_META[result.id];
        const detailMeta = getDetailMeta(result);
        return (
          <List.Item
            key={result.id}
            title={result.name}
            icon={result.error ? { source: Icon.ExclamationMark, tintColor: Color.Red } : getProviderIcon(result.id)}
            accessories={
              effectiveMenuBarProvider === result.id ? [{ tag: { value: "Selected", color: Color.Blue } }] : []
            }
            detail={
              <List.Item.Detail
                // markdown={result.error ? `# ${result.name}\n\n⚠️ ${result.error}` : `# ${result.name}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={result.name} />
                    {detailMeta.map(({ label, value }, i) => (
                      <List.Item.Detail.Metadata.Label key={`${label}-${i}`} title={label} text={value} />
                    ))}
                    {lastUpdatedText ? (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Last updated" text={lastUpdatedText} />
                      </>
                    ) : null}
                    {detailMeta.length > 0 && meta ? <List.Item.Detail.Metadata.Separator /> : null}
                    {meta ? (
                      <>
                        <List.Item.Detail.Metadata.Link title="Usage Dashboard" target={meta.usageUrl} text="View" />
                        <List.Item.Detail.Metadata.Link title="Status Page" target={meta.statusUrl} text="View" />
                      </>
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
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
        );
      })}
    </List>
  );
}

/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Color, Icon, Image, List, showHUD, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchAllProviders, PROVIDER_META } from "./providers/registry";
import { MetricLine } from "./types";
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

function getLineTitle(line: MetricLine): string {
  if (line.type === "text") {
    return `${line.label}: ${line.value}`;
  }
  return line.label;
}

function getLineSubtitle(line: MetricLine): string | undefined {
  if (line.type !== "progress") return undefined;

  const percentage = line.max > 0 ? Math.round((line.value / line.max) * 100) : 0;
  const valueText = formatProgressValue(line.value, line.max, line.unit);
  return `${formatProgressBar(percentage)} ${valueText}`;
}

function getLineAccessories(line: MetricLine): List.Item.Accessory[] {
  if (line.type === "progress" && line.subtitle) {
    return [{ text: { value: line.subtitle, color: Color.SecondaryText } }];
  }
  if (line.type === "badge") {
    return [{ tag: { value: line.text, color: Color.Blue } }];
  }
  return [];
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

  function moveToTop() {
    if (index <= 0) return;
    const next = [...props.orderedIds];
    next.splice(index, 1);
    next.unshift(props.providerId);
    props.onReorder(next);
    showToast({ style: Toast.Style.Success, title: `Moved ${props.providerName} to top` });
  }

  function moveUp() {
    if (!canMoveUp) return;
    const next = [...props.orderedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    props.onReorder(next);
    showToast({ style: Toast.Style.Success, title: `Moved ${props.providerName} up` });
  }

  function moveDown() {
    if (!canMoveDown) return;
    const next = [...props.orderedIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    props.onReorder(next);
    showToast({ style: Toast.Style.Success, title: `Moved ${props.providerName} down` });
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
            onAction={moveToTop}
          />
        )}
        {canMoveUp && (
          <Action
            title="Move Up"
            icon={Icon.ChevronUp}
            shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
            onAction={moveUp}
          />
        )}
        {canMoveDown && (
          <Action
            title="Move Down"
            icon={Icon.ChevronDown}
            shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
            onAction={moveDown}
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
        {props.currentMenuBarProvider && props.currentMenuBarProvider !== "all" && (
          <Action
            title="Show All in Menu Bar"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => props.onSetMenuBarProvider("all")}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function ViewUsage() {
  const { data, isLoading, revalidate } = usePromise(fetchAllProviders);
  const [menuBarProvider, setMenuBarProvider] = useState<string | undefined>(getSelectedMenuBarProvider);
  const [providerOrder, setProviderOrderState] = useState<string[] | undefined>(getProviderOrder);

  const orderedData = useMemo(() => reorderProviders(data, providerOrder), [data, providerOrder]);
  const orderedIds = useMemo(() => orderedData?.map((r) => r.id) ?? [], [orderedData]);

  function handleSetMenuBarProvider(providerId: string) {
    setSelectedMenuBarProvider(providerId);
    setMenuBarProvider(providerId);
    const label = providerId === "all" ? "All Providers" : (PROVIDER_META[providerId]?.name ?? providerId);
    showHUD(`Menu Bar → ${label}`);
  }

  function handleReorder(newOrder: string[]) {
    setProviderOrder(newOrder);
    setProviderOrderState(newOrder);
  }

  return (
    <List isLoading={isLoading}>
      {data && data.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Providers Enabled"
          description="Enable at least one provider in the extension preferences."
          icon={Icon.Gear}
        />
      )}
      {orderedData?.map((result) => (
        <List.Section
          key={result.id}
          title={result.name}
          subtitle={result.error ? "⚠️ Error" : menuBarProvider === result.id ? "📌 Menu Bar" : undefined}
        >
          {result.error ? (
            <List.Item
              title={result.error}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              accessories={PROVIDER_META[result.id] ? [{ icon: PROVIDER_META[result.id].icon }] : []}
              actions={
                <ProviderActions
                  providerId={result.id}
                  providerName={result.name}
                  currentMenuBarProvider={menuBarProvider}
                  orderedIds={orderedIds}
                  onRefresh={revalidate}
                  onSetMenuBarProvider={handleSetMenuBarProvider}
                  onReorder={handleReorder}
                />
              }
            />
          ) : (
            result.lines?.map((line, i) => (
              <List.Item
                key={`${line.type}-${line.label}-${i}`}
                title={getLineTitle(line)}
                subtitle={getLineSubtitle(line)}
                icon={getProviderIcon(result.id)}
                accessories={getLineAccessories(line)}
                actions={
                  <ProviderActions
                    providerId={result.id}
                    providerName={result.name}
                    currentMenuBarProvider={menuBarProvider}
                    orderedIds={orderedIds}
                    onRefresh={revalidate}
                    onSetMenuBarProvider={handleSetMenuBarProvider}
                    onReorder={handleReorder}
                  />
                }
              />
            ))
          )}
        </List.Section>
      ))}
    </List>
  );
}

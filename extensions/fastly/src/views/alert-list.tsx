import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { AlertDefinition, AlertHistoryEntry, FastlyService } from "../types";
import { getAlertDefinitions, getAlertHistory, getServices } from "../api";

const MAX_PAGES = 5;

function describeThreshold(definition: AlertDefinition): string {
  const strategy = definition.evaluation_strategy;
  if (!strategy) return "";
  const parts = [strategy.type, strategy.threshold != null ? String(strategy.threshold) : null, strategy.period]
    .filter(Boolean)
    .join(" · ");
  return parts;
}

function historyStatusAccessory(entry: AlertHistoryEntry): List.Item.Accessory {
  const active = !entry.end;
  if (active) {
    return { tag: { value: entry.status || "Firing", color: Color.Red }, tooltip: "This alert is still active" };
  }
  return { tag: { value: entry.status || "Resolved", color: Color.Green } };
}

export function AlertList() {
  const [view, setView] = useState("definitions");
  const [definitions, setDefinitions] = useState<AlertDefinition[]>([]);
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);

      const [definitionList, historyList, services] = await Promise.all([
        loadAllPages<AlertDefinition>((cursor) => getAlertDefinitions(cursor)),
        loadAllPages<AlertHistoryEntry>((cursor) => getAlertHistory({ cursor })),
        getServices().catch(() => [] as FastlyService[]),
      ]);

      setDefinitions(definitionList);
      setHistory(historyList);
      setServiceNames(Object.fromEntries(services.map((service) => [service.id, service.name])));
    } catch (error) {
      console.error("Error loading alerts:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAllPages<T>(
    fetchPage: (cursor?: string) => Promise<{ data?: T[]; meta?: { next_cursor?: string | null } }>,
  ): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const response = await fetchPage(cursor);
      items.push(...(response.data || []));
      cursor = response.meta?.next_cursor || undefined;
      pages += 1;
    } while (cursor && pages < MAX_PAGES);
    return items;
  }

  const definitionNames = Object.fromEntries(definitions.map((definition) => [definition.id, definition.name]));

  function commonActions() {
    return (
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={loadData}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={view === "definitions" ? "Search alert definitions..." : "Search alert history..."}
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={view} onChange={setView}>
          <List.Dropdown.Item value="definitions" title="Definitions" />
          <List.Dropdown.Item value="history" title="History" />
        </List.Dropdown>
      }
    >
      {view === "definitions" ? (
        definitions.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No Alert Definitions"
            description="Create alerts in the Fastly control panel to get notified when metrics cross thresholds."
            icon={Icon.Bell}
          />
        ) : (
          definitions.map((definition) => (
            <List.Item
              key={definition.id}
              title={definition.name || definition.id}
              subtitle={[definition.source, definition.metric].filter(Boolean).join(" · ")}
              keywords={[definition.metric || "", definition.service_id || ""].filter(Boolean)}
              icon={Icon.Bell}
              accessories={[
                definition.service_id
                  ? { text: serviceNames[definition.service_id] || definition.service_id, tooltip: "Service" }
                  : {},
                { text: describeThreshold(definition), tooltip: "Evaluation strategy" },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Definition ID" content={definition.id} />
                  {commonActions()}
                </ActionPanel>
              }
            />
          ))
        )
      ) : history.length === 0 && !isLoading ? (
        <List.EmptyView title="No Alert History" description="No alerts have fired recently." icon={Icon.CheckCircle} />
      ) : (
        history.map((entry) => (
          <List.Item
            key={entry.id}
            title={
              entry.definition?.name || definitionNames[entry.definition_id || ""] || entry.definition_id || entry.id
            }
            subtitle={
              entry.start
                ? `${new Date(entry.start).toLocaleString()}${entry.end ? ` → ${new Date(entry.end).toLocaleString()}` : " → ongoing"}`
                : undefined
            }
            icon={entry.end ? Icon.Bell : { source: Icon.Bell, tintColor: Color.Red }}
            accessories={[historyStatusAccessory(entry)]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Definition ID" content={entry.definition_id || entry.id} />
                {commonActions()}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

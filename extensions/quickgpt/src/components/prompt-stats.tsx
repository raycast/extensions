import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, Alert, confirmAlert, Icon, List, Toast, open, showToast } from "@raycast/api";
import promptManager from "../managers/prompt-manager";
import promptUsageStore from "../stores/prompt-usage-store";
import { buildPromptUsageSections, PromptUsageRow } from "../utils/prompt-usage-utils";

export function PromptStats() {
  const [rows, setRows] = useState<PromptUsageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRows = useCallback(async () => {
    setIsLoading(true);

    try {
      const allPrompts = promptManager.getFilteredPrompts(() => true);
      const nextRows = await promptUsageStore.getPromptUsageRows(allPrompts);
      setRows(nextRows);
    } catch (error) {
      console.error("Failed to load prompt usage stats:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load usage stats",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleClearStats = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear all usage stats?",
      message: "This will reset all prompt usage counts and can't be undone.",
      primaryAction: {
        title: "Clear Stats",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await promptUsageStore.clearAllUsageStats();
    await loadRows();
    await showToast({
      style: Toast.Style.Success,
      title: "Usage stats cleared",
    });
  }, [loadRows]);

  const sections = buildPromptUsageSections(rows);

  return (
    <List isLoading={isLoading} navigationTitle="Prompt Stats" searchBarPlaceholder="Filter usage stats…">
      <List.Section title="Top Used" subtitle={`${sections.topUsed.length} prompts`}>
        {sections.topUsed.length > 0 ? (
          sections.topUsed.map((row) => renderUsageItem(row, "top", handleClearStats, loadRows))
        ) : (
          <List.Item key="top-empty" title="No usage data yet" icon={Icon.BarChart} />
        )}
      </List.Section>

      <List.Section title="Recent 7 Days" subtitle={`${sections.recent7d.length} prompts`}>
        {sections.recent7d.length > 0 ? (
          sections.recent7d.map((row) => renderUsageItem(row, "recent", handleClearStats, loadRows))
        ) : (
          <List.Item key="recent-empty" title="No activity this week" icon={Icon.Clock} />
        )}
      </List.Section>

      <List.Section title="Low / Never Used" subtitle={`${sections.lowUsage.length} prompts`}>
        {sections.lowUsage.map((row) => renderUsageItem(row, "low", handleClearStats, loadRows))}
      </List.Section>
    </List>
  );
}

function renderUsageItem(
  row: PromptUsageRow,
  sectionKey: string,
  onClearStats: () => Promise<void>,
  onRefresh: () => Promise<void>,
) {
  const isNeverUsed = row.totalCount === 0;
  const deeplink = `raycast://extensions/ddhjy2012/quickgpt/prompt-lab?arguments=${encodeURIComponent(
    JSON.stringify({
      target: `quickgpt-${row.identifier}`,
    }),
  )}`;

  return (
    <List.Item
      key={`${sectionKey}-${row.identifier}`}
      icon={isNeverUsed ? Icon.MinusCircle : Icon.BarChart}
      title={row.title}
      subtitle={getSubtitle(row)}
      accessories={[
        { tag: { value: `${row.totalCount} total` } },
        { tag: { value: `7d ${row.recent7d}` } },
        { tag: { value: `30d ${row.recent30d}` } },
        {
          text: isNeverUsed ? "Never used" : formatLastUsed(row.lastUsedAt),
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Open Prompt"
            icon={Icon.ArrowRight}
            onAction={async () => {
              await open(deeplink);
            }}
          />
          <Action.CopyToClipboard title="Copy Deeplink" content={deeplink} icon={Icon.Link} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          <Action title="Clear Stats" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onClearStats} />
        </ActionPanel>
      }
    />
  );
}

function getSubtitle(row: PromptUsageRow): string | undefined {
  if (row.path && row.path !== row.title) {
    return row.path;
  }

  return row.filePath;
}

function formatLastUsed(lastUsedAt?: string): string {
  if (!lastUsedAt) {
    return "Never used";
  }

  return new Date(lastUsedAt).toLocaleString();
}

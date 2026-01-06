import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { HistoryItem, HistoryManager } from "./history";
import AnalysisView from "./analysis-view";

export default function ViewHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { push } = useNavigation();

  async function loadHistory() {
    const items = await HistoryManager.getHistory();
    setHistory(items);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleClearHistory() {
    if (
      await confirmAlert({
        title: "Clear History",
        message: "Are you sure you want to clear all history?",
        primaryAction: {
          title: "Clear",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await HistoryManager.clearHistory();
      setHistory([]);
    }
  }

  return (
    <List
      actions={
        history.length > 0 ? (
          <ActionPanel>
            <Action
              title="Clear History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClearHistory}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {history.length === 0 ? (
        <List.EmptyView
          title="No History"
          description="Run a grammar check to see your history here."
          icon={Icon.Clock}
        />
      ) : (
        history.map((item) => {
          // Handle both old (issuesCount) and new (issues[]) history formats
          const issues = item.issues || [];
          const issuesCount =
            issues.length ||
            (item as { issuesCount?: number }).issuesCount ||
            0;

          return (
            <List.Item
              key={item.id}
              title={
                item.original.substring(0, 60) +
                (item.original.length > 60 ? "..." : "")
              }
              subtitle={new Date(item.date).toLocaleString()}
              accessories={[
                {
                  text: `${issuesCount} issues`,
                  icon: issuesCount > 0 ? Icon.Warning : Icon.CheckCircle,
                  tooltip: "Issues found",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(
                        <AnalysisView
                          result={{ corrected: item.corrected, issues: issues }}
                          originalText={item.original}
                        />,
                      )
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Corrected"
                    content={item.corrected}
                  />
                  <Action.CopyToClipboard
                    title="Copy Original"
                    content={item.original}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleClearHistory}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

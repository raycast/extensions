import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useMemo } from "react";
import { EntryType } from "../types";
import { getEntriesSummary } from "../utils";

interface EntriesSummaryProps {
  entries: EntryType[] | null;
  onCancel?: () => void;
}

export const EntriesSummary = ({ entries, onCancel }: EntriesSummaryProps) => {
  const summary = useMemo(() => {
    if (!entries || !Array.isArray(entries)) {
      return null;
    }
    return getEntriesSummary(entries);
  }, [entries]);

  if (!summary || !summary.exists) {
    return null;
  }

  return (
    <List.Section title="Summary">
      <List.Item
        title={summary.title}
        subtitle={summary.subtitle}
        accessories={[
          {
            icon: { source: Icon.Coins, tintColor: "#10B981" },
            text: summary.billable,
          },
          {
            icon: { source: Icon.Minus, tintColor: "#EF4444" },
            text: summary.unbillable,
          },
        ]}
        actions={
          <ActionPanel>
            {onCancel && (
              <Action
                title="Back"
                icon={Icon.ArrowLeft}
                onAction={onCancel}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
              />
            )}
          </ActionPanel>
        }
      />
    </List.Section>
  );
};

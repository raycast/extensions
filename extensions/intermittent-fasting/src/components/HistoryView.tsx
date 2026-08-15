import { List, ActionPanel, Action, Icon } from "@raycast/api";
import React from "react";
import { ListItem } from "./ListItem";
import { EnhancedItem } from "../types";
import ImportExport from "./ImportExport";

interface HistoryViewProps {
  fastingHistory: EnhancedItem[] | undefined;
  revalidate: () => Promise<EnhancedItem[]>;
  isLoading: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ fastingHistory, revalidate, isLoading }) => {
  const [items, setItems] = React.useState<EnhancedItem[] | undefined>(fastingHistory);

  const handleRevalidate = React.useCallback(async () => {
    const updatedItems = await revalidate();
    setItems(updatedItems);
    return updatedItems;
  }, [revalidate]);

  const emptyStateActions = (
    <ActionPanel>
      <ActionPanel.Section title="History">
        <Action.Push
          title="Import History"
          icon={Icon.Upload}
          target={<ImportExport data={items} onComplete={handleRevalidate} mode="import" />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      actions={!items || items.length === 0 ? emptyStateActions : undefined}
      searchBarPlaceholder="Search fasting history..."
    >
      <List.Section title="History">
        {items?.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            revalidate={handleRevalidate}
            actions={
              <ActionPanel.Section title="History">
                <Action.Push
                  title="Import History"
                  icon={Icon.Upload}
                  target={<ImportExport data={items} onComplete={handleRevalidate} mode="import" />}
                />
                <Action.Push
                  title="Export History"
                  icon={Icon.Download}
                  target={<ImportExport data={items} onComplete={handleRevalidate} mode="export" />}
                />
              </ActionPanel.Section>
            }
          />
        ))}
      </List.Section>
      {!isLoading && (!items || items.length === 0) && (
        <List.EmptyView
          icon={Icon.List}
          title="No Fasting History"
          description="Import your history or start tracking your fasts"
          actions={emptyStateActions}
        />
      )}
    </List>
  );
};

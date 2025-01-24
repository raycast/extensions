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

  return (
    <List isLoading={isLoading}>
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
    </List>
  );
};

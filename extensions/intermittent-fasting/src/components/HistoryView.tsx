import { List, ActionPanel } from "@raycast/api";
import React from "react";
import { ListItem } from "./ListItem";
import { EnhancedItem } from "../types";
import { ExportHistory } from "./actions/exportHistory";
import { ImportHistory } from "./actions/importHistory";

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
              <ActionPanel.Section>
                <ExportHistory data={items} />
                <ImportHistory revalidate={handleRevalidate} />
              </ActionPanel.Section>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

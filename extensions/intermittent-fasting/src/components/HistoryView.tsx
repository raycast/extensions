import { List } from "@raycast/api";
import React from "react";
import { ListItem } from "./ListItem";
import { EnhancedItem } from "../types";

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
      {items?.map((item, index) => <ListItem key={index} item={item} revalidate={handleRevalidate} />)}
    </List>
  );
};

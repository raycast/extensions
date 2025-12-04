import { Action, Icon } from "@raycast/api";
import React from "react";
import { HistoryView } from "../HistoryView";
import { EnhancedItem } from "../../types";

interface ViewHistoryProps {
  fastingHistory: EnhancedItem[] | undefined;
  revalidate: () => Promise<EnhancedItem[]>;
  isLoading: boolean;
}

export const ViewHistory: React.FC<ViewHistoryProps> = ({ fastingHistory, revalidate, isLoading }) => {
  return (
    <Action.Push
      title="View History"
      target={<HistoryView fastingHistory={fastingHistory} revalidate={revalidate} isLoading={isLoading} />}
      icon={Icon.Eye}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
    />
  );
};

import { List, ActionPanel, Icon } from "@raycast/api";
import { FC } from "react";
import { StartFasting } from "./actions/startFasting";
import { ViewHistory } from "./actions/viewHistory";
import { EnhancedItem } from "../types";

interface EmptyViewProps {
  startItem: () => Promise<EnhancedItem[]>;
  revalidate: () => Promise<EnhancedItem[]>;
}

export const EmptyView: FC<EmptyViewProps> = ({ startItem, revalidate }) => {
  return (
    <List.EmptyView
      title="No Fasting History"
      description="Start a new fasting period"
      icon={Icon.Clock}
      actions={
        <ActionPanel>
          <StartFasting startItem={startItem} revalidate={revalidate} />
          <ViewHistory fastingHistory={[]} revalidate={revalidate} isLoading={false} />
        </ActionPanel>
      }
    />
  );
};

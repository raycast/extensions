import { List, ActionPanel, Icon } from "@raycast/api";
import { FC } from "react";
import { StartFasting } from "./actions/startFasting";
import { ImportHistory } from "./actions/importHistory";
import { EnhancedItem } from "../types";

interface EmptyViewProps {
  startItem: () => Promise<EnhancedItem[]>;
  revalidate: () => Promise<EnhancedItem[]>;
}

export const EmptyView: FC<EmptyViewProps> = ({ startItem, revalidate }) => {
  return (
    <List.EmptyView
      title="No Fasting History"
      description="Start your first fast"
      icon={Icon.Clock}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <StartFasting startItem={startItem} revalidate={revalidate} />
            <ImportHistory revalidate={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

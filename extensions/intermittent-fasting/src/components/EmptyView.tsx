import { List, ActionPanel, Icon, Action } from "@raycast/api";
import { FC } from "react";
import { StartFasting } from "./actions/startFasting";
import { EnhancedItem } from "../types";
import ImportExport from "./ImportExport";

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
            <Action.Push
              title="Import History"
              icon={Icon.Upload}
              target={<ImportExport data={[]} onComplete={revalidate} mode="import" />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

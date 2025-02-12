import { ActionPanel, List } from "@raycast/api";
import { Checklist } from "../types";
import { CreateChecklistAction } from "../actions/create-checklist";

export function EmptyView(props: { checklists: Checklist[]; onCreate: (checklist: Checklist) => void }) {
  return (
    <List.EmptyView
      icon="🥳"
      title="Welcome to Checklist!"
      description={`Start by creating your first checklist. \nPress CMD+N to get started.`}
      actions={
        <ActionPanel>
          <CreateChecklistAction onCreate={props.onCreate} />
        </ActionPanel>
      }
    />
  );
}

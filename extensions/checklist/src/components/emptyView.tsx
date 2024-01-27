import { ActionPanel, List } from "@raycast/api";
import { Checklist } from "../types";
import CreateChecklistAction from "../actions/createChecklist";

function EmptyView(props: { checklists: Checklist[]; onCreate: (checklist: Omit<Checklist, "id">) => void }) {
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

export default EmptyView;

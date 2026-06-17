import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateSpaceForm, CreateSpaceFormValues } from "..";

type EmptyViewSpaceProps = {
  title: string;
  contextValues: CreateSpaceFormValues;
};

export function EmptyViewSpace({ title, contextValues }: EmptyViewSpaceProps) {
  return (
    <List.EmptyView
      title={title}
      description="Create a new space by pressing ⏎"
      actions={
        <ActionPanel>
          <Action.Push title="Create Space" target={<CreateSpaceForm draftValues={contextValues} />} icon={Icon.Plus} />
        </ActionPanel>
      }
    />
  );
}

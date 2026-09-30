import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateTypeForm, CreateTypeFormValues } from "..";

type EmptyViewTypeProps = {
  title: string;
  contextValues: CreateTypeFormValues;
};

export function EmptyViewType({ title, contextValues }: EmptyViewTypeProps) {
  return (
    <List.EmptyView
      title={title}
      description="Create a new type by pressing ⏎"
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Type"
            target={<CreateTypeForm draftValues={contextValues} enableDrafts={false} />}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    />
  );
}

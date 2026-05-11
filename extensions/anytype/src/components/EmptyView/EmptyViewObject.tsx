import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateObjectForm, CreateObjectFormValues } from "..";

type EmptyViewObjectProps = {
  title: string;
  contextValues: CreateObjectFormValues;
};

export function EmptyViewObject({ title, contextValues }: EmptyViewObjectProps) {
  const draftValues: CreateObjectFormValues = { ...contextValues };

  return (
    <List.EmptyView
      title={title}
      description="Create a new object by pressing ⏎"
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Object"
            target={<CreateObjectForm draftValues={draftValues} enableDrafts={false} />}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    />
  );
}

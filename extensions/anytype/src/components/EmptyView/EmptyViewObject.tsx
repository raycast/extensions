import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateObjectForm } from "..";
import { CreateObjectFormValues } from "../../create-object";

type EmptyViewObjectProps = {
  title: string;
  contextValues: CreateObjectFormValues;
};

export function EmptyViewObject({ title, contextValues }: EmptyViewObjectProps) {
  const draftValues: CreateObjectFormValues = {
    spaceId: contextValues.spaceId,
    typeId: contextValues.typeId,
    listId: contextValues.listId,
    name: contextValues.name,
    icon: contextValues.icon,
    description: contextValues.description,
    body: contextValues.body,
    source: contextValues.source,
  };

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

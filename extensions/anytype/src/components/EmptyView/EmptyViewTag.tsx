import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateTagForm, CreateTagFormValues } from "..";

type EmptyViewTagProps = {
  title: string;
  spaceId: string;
  propertyId: string;
  contextValues: CreateTagFormValues;
};

export function EmptyViewTag({ title, spaceId, propertyId, contextValues }: EmptyViewTagProps) {
  return (
    <List.EmptyView
      title={title}
      description="Create a new tag by pressing ⏎"
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Tag"
            target={<CreateTagForm spaceId={spaceId} propertyId={propertyId} draftValues={contextValues} />}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    />
  );
}

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreatePropertyForm, CreatePropertyFormValues } from "..";

type EmptyViewPropertyProps = {
  title: string;
  spaceId: string;
  contextValues: CreatePropertyFormValues;
};

export function EmptyViewProperty({ title, spaceId, contextValues }: EmptyViewPropertyProps) {
  return (
    <List.EmptyView
      title={title}
      description="Create a new property by pressing ⏎"
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Property"
            target={<CreatePropertyForm spaceId={spaceId} draftValues={contextValues} />}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    />
  );
}

import { useMemo } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { useTags } from "../hooks";
import { Workspace, deleteTag } from "../api";
import TagForm from "./TagForm";
import { withToast, Verb } from "../helpers/withToast";

interface TagListProps {
  workspace: Workspace;
  isLoading: boolean;
}

export default function TagList({ workspace, isLoading }: TagListProps) {
  const { tags, isLoadingTags, revalidateTags } = useTags();

  const filteredTags = useMemo(() => tags.filter((tag) => tag.workspace_id === workspace.id), [tags]);

  const canModifyTags =
    !workspace.only_admins_may_create_tags || workspace.role == "admin" || workspace.role == "projectlead";

  return (
    <List isLoading={isLoading || isLoadingTags}>
      {filteredTags.length == 0 && <List.EmptyView title="No Tags Found" />}
      {filteredTags.map((tag) => (
        <List.Item
          title={tag.name}
          key={tag.id}
          actions={
            canModifyTags ? (
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Rename Tag"
                    icon={Icon.Pencil}
                    shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
                    target={<TagForm {...{ tag, workspace, revalidateTags }} />}
                  />
                  <Action
                    title="Delete Tag"
                    icon={Icon.Trash}
                    shortcut={{ key: "x", modifiers: ["ctrl"] }}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Tag",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                          message: "Deleting this tag will permanently remove it from all time entries.",
                        })
                      )
                        await withToast({
                          noun: "Tag",
                          verb: Verb.Delete,
                          action: async () => {
                            await deleteTag(tag.workspace_id, tag.id);
                            revalidateTags();
                          },
                        });
                    }}
                  />
                </ActionPanel.Section>
                <Action.Push
                  title="Create New Tag"
                  icon={Icon.Plus}
                  shortcut={{ key: "n", modifiers: ["cmd", "shift"] }}
                  target={<TagForm {...{ workspace, revalidateTags }} />}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
    </List>
  );
}

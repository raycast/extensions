import { useMemo } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { useTags } from "../hooks";
import { Workspace, Tag, deleteTag } from "../api";
import TagForm from "./TagForm";

interface TagListProps {
  workspace: Workspace;
  isLoading: boolean;
}

export default function TagList({ workspace, isLoading }: TagListProps) {
  const { tags, isLoadingTags, revalidateTags } = useTags();

  const filteredTags = useMemo(() => tags.filter((tag) => tag.workspace_id === workspace.id), [tags]);

  const canModifyTag = useMemo(
    () => !workspace.only_admins_may_create_tags || workspace.role == "admin" || workspace.role == "projectlead",
    [workspace],
  );

  async function handleTagDelete(tag: Tag) {
    if (
      await confirmAlert({
        title: "Are You Sure?",
        message: "Deleting this tag will permanently remove it from all time entries.",
      })
    ) {
      const toast = await showToast({ title: "Deleting Tag", style: Toast.Style.Animated });
      try {
        await deleteTag(tag.workspace_id, tag.id);
        revalidateTags();
        toast.style = Toast.Style.Success;
        toast.title = "Tag deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't deleted tag";
        if (error instanceof Error) toast.message = error.message;
      }
    }
  }

  return (
    <List isLoading={isLoading || isLoadingTags}>
      {filteredTags.length == 0 && <List.EmptyView title="No Tags Found" />}
      {filteredTags.map((tag) => (
        <List.Item
          title={tag.name}
          key={tag.id}
          actions={
            canModifyTag ? (
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
                    onAction={() => handleTagDelete(tag)}
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

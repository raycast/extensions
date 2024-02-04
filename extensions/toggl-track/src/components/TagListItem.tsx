import { List, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { Workspace, Tag, deleteTag } from "../api";
import TagForm from "./TagForm";
import { withToast, Verb } from "../helpers/withToast";

interface TagListProps {
  workspace: Workspace;
  tag: Tag;
  revalidateTags: () => void;
  SharedActions: React.ReactNode;
}

export default function TagListItem({ workspace, tag, revalidateTags, SharedActions }: TagListProps) {
  const canModifyTags =
    !workspace.only_admins_may_create_tags || workspace.role == "admin" || workspace.role == "projectlead";
  return (
    <List.Item
      title={tag.name}
      actions={
        canModifyTags ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Rename Tag"
                icon={Icon.Pencil}
                shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
                target={<TagForm {...{ tag, revalidateTags }} />}
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
            {SharedActions}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

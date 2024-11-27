import { List, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";

import { Workspace, Tag, deleteTag } from "@/api";
import TagForm from "@/components/TagForm";
import { canModifyTagsIn } from "@/helpers/privileges";
import Shortcut from "@/helpers/shortcuts";
import { withToast, Verb } from "@/helpers/withToast";

interface TagListProps {
  workspace: Workspace;
  tag: Tag;
  revalidateTags: () => void;
  SharedActions: React.ReactNode;
}

export default function TagListItem({ workspace, tag, revalidateTags, SharedActions }: TagListProps) {
  return (
    <List.Item
      title={tag.name}
      actions={
        canModifyTagsIn(workspace) ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Rename Tag"
                icon={Icon.Pencil}
                shortcut={Shortcut.Edit}
                target={<TagForm {...{ tag, revalidateTags }} />}
              />
              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                shortcut={Shortcut.Remove}
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

import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";

import { Workspace, Tag, updateTag, createTag } from "@/api";
import { withToast, Verb } from "@/helpers/withToast";

type TagFormProps =
  | {
      tag: Tag;
      workspaces?: never;
      revalidateTags: () => void;
    }
  | {
      tag?: never;
      workspaces: Workspace[];
      revalidateTags: () => void;
    };

export default function TagForm({ tag, workspaces, revalidateTags }: TagFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={tag ? "Rename" : "Create" + " Tag"}
            onSubmit={({ name, workspaceId }: { name: string; workspaceId: string }) =>
              withToast({
                noun: "Tag",
                verb: tag ? Verb.Rename : Verb.Create,
                message: tag?.name,
                action: async () => {
                  if (tag) await updateTag(tag.workspace_id, tag.id, name);
                  else await createTag(parseInt(workspaceId), name);
                  revalidateTags();
                  pop();
                },
              })
            }
          />
        </ActionPanel>
      }
    >
      {!tag && (
        <Form.Dropdown id="workspaceId" title="Workspace">
          {workspaces.map((workspace) => (
            <Form.Dropdown.Item key={workspace.id} title={workspace.name} value={workspace.id.toString()} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="name" title="Name" defaultValue={tag?.name} />
    </Form>
  );
}

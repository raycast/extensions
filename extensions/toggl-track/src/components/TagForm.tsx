import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { Workspace, Tag, updateTag, createTag } from "../api";
import { withToast, Verb } from "../helpers/withToast";

interface TagFormProps {
  tag?: Tag;
  workspace: Workspace;
  revalidateTags: () => void;
}

export default function TagForm({ workspace, tag, revalidateTags }: TagFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={tag ? "Rename" : "Create" + " Tag"}
            onSubmit={({ name }: { name: string }) =>
              withToast({
                noun: "Tag",
                verb: tag ? Verb.Rename : Verb.Create,
                message: tag?.name,
                action: async () => {
                  if (tag) await updateTag(tag.workspace_id, tag.id, name);
                  else await createTag(workspace.id, name);
                  revalidateTags();
                  pop();
                },
              })
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={tag?.name} />
    </Form>
  );
}

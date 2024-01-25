import { ActionPanel, Form, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { Workspace, Tag, updateTag, createTag } from "../api";

interface TagFormProps {
  tag?: Tag;
  workspace: Workspace;
  revalidateTags: () => void;
}

export default function TagForm({ workspace, tag, revalidateTags }: TagFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit({ name }: { name: string }) {
    const toast = await showToast(Toast.Style.Animated, (tag ? "Updating" : "Creating") + " Tag");
    try {
      if (tag) await updateTag(tag.workspace_id, tag.id, name);
      else if (workspace) {
        await createTag(workspace.id, name);
      } else {
        throw new Error('TagForm must be passed either "workspaces" or "tag"');
      }
      toast.style = Toast.Style.Success;
      toast.title = toast.title.replace("ing", "ed");
      revalidateTags();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't " + toast.title.replace("ing", "e");
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={tag ? "Rename" : "Create" + " Tag"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={tag?.name} />
    </Form>
  );
}

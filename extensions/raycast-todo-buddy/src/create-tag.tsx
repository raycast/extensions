import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import ListTags from "./list-tags";
import { v4 as uuidv4 } from "uuid";
import { createTag } from "./storage";

export default function Command() {
  const { push } = useNavigation();
  async function onCreate(values: Record<string, string>) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating a new Tag...",
      message: values.name,
    });
    try {
      await createTag({ id: uuidv4(), name: values.name });
      toast.style = Toast.Style.Success;
      toast.title = "Created a tag: " + values.name;
      push(<ListTags />);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create tag";
      if (e instanceof Error) {
        toast.message = e.message;
      }
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tag" onSubmit={onCreate} />
          <Action.Push title="List Tags" target={<ListTags />} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Tag Name" />
    </Form>
  );
}

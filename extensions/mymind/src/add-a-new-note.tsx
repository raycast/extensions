import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { createMyMindNote, addTagToCard } from "./utils";

type Values = {
  title: string;
  content: string;
  tags: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating note...",
    });

    try {
      const response = await createMyMindNote(values.content, values.title);

      // If tags were provided, add them
      if (values.tags) {
        const tags = values.tags.split(",").map((tag) => tag.trim());
        for (const tag of tags) {
          if (tag) {
            await addTagToCard(response.id, tag);
          }
        }
      }

      toast.style = Toast.Style.Success;
      toast.title = "Note created successfully";

      // Close the main window instead of launching the search command
      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create note";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new note in MyMind. You can use markdown for formatting." />
      <Form.TextField id="title" title="Title" placeholder="Enter note title (optional)" />
      <Form.TextField id="tags" title="Tags" placeholder="Enter tags separated by commas (optional)" />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter your note content using markdown..."
        enableMarkdown
      />
    </Form>
  );
}

import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { Prompt } from "../types";

export function EditPromptForm(props: { prompt: Prompt; onEdit: (prompt: Prompt) => void }) {
  const { prompt, onEdit } = props;
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Edit ${prompt.title}`}
            onSubmit={(values: { title: string; content: string; tags: string; enabled: boolean }) => {
              onEdit({
                ...prompt,
                title: values.title,
                content: values.content,
                tags: values.tags.split(",").filter((tag) => tag.trim() !== ""),
                enabled: values.enabled,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={prompt.title} title="Title" />
      <Form.TextArea id="content" defaultValue={prompt.content} title="Content" />
      <Form.TextField
        id="tags"
        defaultValue={prompt.tags?.join(",") ?? ""}
        title="Tags"
        placeholder="split by comma, eg: tag1,tag2"
      />
      <Form.Checkbox id="enabled" defaultValue={prompt.enabled} title="Enabled" label="Enabled" />
    </Form>
  );
}

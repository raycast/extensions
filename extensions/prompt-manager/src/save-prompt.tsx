import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { usePromptStore } from "./store/usePromptStore";
import { Prompt } from "./types";

export default function Command({ prompt }: { prompt?: Prompt }) {
  const { pop } = useNavigation();
  const { addPrompt, updatePrompt } = usePromptStore();

  function handleSubmit(values: {
    title: string;
    content: string;
    tags: string;
  }) {
    if (!values.title || !values.content) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        description: "Title and Content are required",
      });
      return;
    }

    const tagsArray = values.tags
      ? values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== "")
      : [];

    if (prompt) {
      updatePrompt(prompt.id, {
        title: values.title,
        content: values.content,
        tags: tagsArray,
      });
      showToast({
        style: Toast.Style.Success,
        title: "Prompt Updated",
      });
    } else {
      addPrompt({
        title: values.title,
        content: values.content,
        tags: tagsArray,
      });
      showToast({
        style: Toast.Style.Success,
        title: "Prompt Saved",
      });
    }

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={prompt ? "Update Prompt" : "Save Prompt"}
            icon={prompt ? Icon.Checkmark : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          prompt
            ? "Update your existing prompt template."
            : "Create a new prompt template to reuse later with AI tools."
        }
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g. Code Refactor"
        defaultValue={prompt?.title}
        info="A short descriptive name for your prompt."
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="e.g. Refactor this {{language}} code: {{code}}"
        defaultValue={prompt?.content}
        info="The actual prompt text. You can use {{brackets}} for variables."
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="e.g. coding, refactor"
        defaultValue={prompt?.tags?.join(", ")}
        info="Separate tags with commas."
      />
    </Form>
  );
}

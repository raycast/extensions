import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { Prompt, PromptFormValues } from "../types";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useRef } from "react";

export function EditPromptForm(props: { prompt: Prompt; onEdit: (prompt: Prompt) => void }) {
  const { prompt, onEdit } = props;
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, setValue } = useForm({
    onSubmit: (values: PromptFormValues) => {
      onEdit({
        ...prompt,
        title: values.title,
        content: values.content,
        tags: values.tags.split(",").filter((tag) => tag.trim() !== ""),
        enabled: values.enabled,
      });
      pop();
    },
    validation: {
      title: FormValidation.Required,
      content: FormValidation.Required,
    },
  });
  const hasSetContent = useRef(false);

  useEffect(() => {
    if (hasSetContent.current) {
      return;
    }

    setValue("title", prompt.title);
    setValue("content", prompt.content);
    setValue("tags", prompt.tags?.join(",") ?? "");
    setValue("enabled", prompt.enabled);
    hasSetContent.current = true;
  }, [prompt]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Edit ${prompt.title}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter a title for the prompt" {...itemProps.title} />
      <Form.TextArea title="Content" placeholder="Enter the content of the prompt" {...itemProps.content} />
      <Form.TextField title="Tags" placeholder="split by comma, eg: tag1,tag2" {...itemProps.tags} />
      <Form.Checkbox title="Enabled" label="Enabled" {...itemProps.enabled} />
    </Form>
  );
}

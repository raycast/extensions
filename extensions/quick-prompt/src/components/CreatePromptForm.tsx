import { useEffect, useRef } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { PromptFormValues } from "../types";

export function CreatePromptForm(props: {
  defaultTitle?: string;
  onCreate: (values: PromptFormValues) => void;
  selectedText?: string;
  isLoading?: boolean;
}) {
  const { onCreate, defaultTitle = "", selectedText, isLoading = false } = props;
  const { pop } = useNavigation();
  const { handleSubmit, setValue, itemProps } = useForm({
    onSubmit: (values: PromptFormValues) => {
      onCreate(values);
      pop();
    },
    validation: {
      title: FormValidation.Required,
      content: FormValidation.Required,
    },
  });
  const hasSetContent = useRef(false);
  const hasSetTitle = useRef(false);

  useEffect(() => {
    if (selectedText && !hasSetContent.current) {
      setValue("content", selectedText);
      hasSetContent.current = true;
    }
  }, [selectedText]);

  useEffect(() => {
    if (hasSetTitle.current && !defaultTitle) {
      return;
    }

    setValue("title", defaultTitle);
    hasSetTitle.current = true;
  }, [defaultTitle]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        defaultValue={defaultTitle}
        title="Title"
        placeholder="Enter a title for the prompt"
        {...itemProps.title}
      />
      <Form.TextArea title="Content" {...itemProps.content} placeholder="Enter the content of the prompt" />
      <Form.TextField title="Tags" placeholder="split by comma, eg: tag1,tag2" {...itemProps.tags} />
      <Form.TextField id="tags" title="Tags" placeholder="split by comma, eg: tag1,tag2" />
      <Form.Checkbox id="enabled" defaultValue={true} title="Enabled" label="Enabled" />
    </Form>
  );
}

import { useEffect, useRef } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";

export function CreatePromptForm(props: {
  defaultTitle?: string;
  onCreate: (values: { title: string; content: string; tags: string; enabled: boolean }) => void;
  selectedText?: string;
  isLoading?: boolean;
}) {
  const { onCreate, defaultTitle = "", selectedText, isLoading = false } = props;
  const { pop } = useNavigation();
  const { handleSubmit, setValue, itemProps } = useForm({
    onSubmit: (values: { title: string; content: string; tags: string; enabled: boolean }) => {
      onCreate(values);
      pop();
    },
  });
  const hasSetContent = useRef(false);

  useEffect(() => {
    if (selectedText && !hasSetContent.current) {
      setValue("content", selectedText);
      hasSetContent.current = true;
    }
  }, [selectedText]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={defaultTitle} title="Title" />
      <Form.TextArea title="Content" {...itemProps.content} />
      <Form.TextField id="tags" title="Tags" placeholder="split by comma, eg: tag1,tag2" />
      <Form.Checkbox id="enabled" defaultValue={true} title="Enabled" label="Enabled" />
    </Form>
  );
}

import { Form, ActionPanel, Action, Clipboard, open, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
interface FormValues {
  name: string;
  code: string;
}
export default function Command() {
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    onSubmit(values) {
      open(
        `https://codesnap.dev/editor?code=${encodeURIComponent(values.code)}&name=${encodeURIComponent(
          values.name
        )}&tag=Raycast`
      );
    },
    initialValues: {
      name: "CodeSnap Raycast Snippet",
    },
    validation: {
      name: FormValidation.Required,
      code: FormValidation.Required,
    },
  });
  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (!text) {
        return;
      }
      setValue("code", text);
    });
  }, []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snippet" icon={Icon.Image} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Prepare your code snippet" />
      <Form.TextField title="Name of your code snippet" placeholder="Enter name" {...itemProps.name} />
      <Form.TextArea title="Your code" placeholder="Paste your code here" {...itemProps.code} />
    </Form>
  );
}

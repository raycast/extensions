import { ActionPanel, Action, Form, open, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface CopilotFormValues {
  textarea: string;
}

export default function Command() {
  return <FormComponent />;
}

function FormComponent() {
  const { handleSubmit, itemProps } = useForm<CopilotFormValues>({
    async onSubmit(values) {
      const url = `https://github.com/copilot?prompt=${encodeURIComponent(values.textarea)}`;
      await open(url);
      showToast({
        style: Toast.Style.Success,
        title: "Opening GitHub Copilot",
      });
    },
    validation: {
      textarea: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" placeholder="Enter your prompt here..." {...itemProps.textarea} />
    </Form>
  );
}

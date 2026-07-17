import { Action, ActionPanel, Form, Toast, showToast, popToRoot } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createIdea } from "./lib/buffer";

interface FormValues {
  title: string;
  text: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating idea…",
      });
      try {
        await createIdea({
          title: values.title,
          text: values.text || undefined,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Idea created";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create idea";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Idea" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Idea title" {...itemProps.title} />
      <Form.TextArea
        title="Notes"
        placeholder="Optional notes or draft text"
        {...itemProps.text}
      />
      <Form.Description text="Ideas are created in your default group – move them to a specific group in Buffer if needed." />
    </Form>
  );
}

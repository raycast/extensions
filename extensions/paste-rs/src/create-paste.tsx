import { Action, ActionPanel, Clipboard, Form, Keyboard, Toast, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createPaste } from "./api";
import { addToHistory } from "./history";

interface FormValues {
  content: string;
}

export default function CreatePaste() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      content: FormValidation.Required,
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating paste",
      });

      try {
        const result = await createPaste(values.content);
        await Clipboard.copy(result.url);
        await addToHistory({ url: result.url, content: values.content, partial: result.partial });

        toast.style = result.partial ? Toast.Style.Failure : Toast.Style.Success;
        toast.title = result.partial ? "Paste partially uploaded" : "Paste created";
        toast.message = result.partial
          ? `Content exceeded the size limit. Partial URL copied: ${result.url}`
          : `URL copied: ${result.url}`;

        if (!result.partial) {
          await popToRoot();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create paste";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Paste" shortcut={Keyboard.Shortcut.Common.Save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" placeholder="Paste text, logs, Markdown, or code…" {...itemProps.content} />
    </Form>
  );
}

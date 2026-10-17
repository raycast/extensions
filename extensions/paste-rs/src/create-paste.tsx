import { Action, ActionPanel, Form, Keyboard, Toast, getPreferenceValues, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createAndCopyPaste } from "./copy-paste";
import { LANGUAGES } from "./languages";

interface FormValues {
  content: string;
  language: string;
}

export default function CreatePaste() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { language: getPreferenceValues<Preferences>().language ?? "" },
    validation: {
      content: FormValidation.Required,
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating paste",
      });

      try {
        const result = await createAndCopyPaste(values.content, values.language);

        toast.style = result.partial || !result.historySaved ? Toast.Style.Failure : Toast.Style.Success;
        toast.title = result.partial ? "Paste partially uploaded" : "Paste created";
        toast.message = result.partial
          ? `Content exceeded the size limit. Partial URL copied: ${result.url}`
          : `URL copied: ${result.url}`;
        if (!result.historySaved) toast.message += " Local history could not be saved.";

        if (!result.partial && result.historySaved) {
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
      <Form.Dropdown title="Language" {...itemProps.language}>
        {LANGUAGES.map((language) => (
          <Form.Dropdown.Item key={language.value} title={language.title} value={language.value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

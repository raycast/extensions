import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";

export function TextForm({
  navigationTitle,
  submitTitle,
  submitIcon = Icon.ArrowRight,
  initialText = "",
  onSubmit,
}: {
  navigationTitle: string;
  submitTitle: string;
  /** ArrowRight when the next step is choosing a recipient, Upload when submitting sends. */
  submitIcon?: Icon;
  initialText?: string;
  onSubmit: (text: string) => void;
}) {
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    initialValues: { text: initialText },
    validation: { text: (value) => (value?.trim() ? undefined : "Type something to send") },
    onSubmit: (values) => onSubmit(values.text),
  });
  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} icon={submitIcon} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.text}
        title="Text"
        placeholder="Type or paste text"
        info="Arrives as a .txt file named after its first words, like Blip's own Paste."
      />
    </Form>
  );
}

export function FilesForm({ onSubmit }: { onSubmit: (paths: string[]) => void }) {
  const { handleSubmit, itemProps } = useForm<{ paths: string[] }>({
    validation: { paths: (value) => (value?.length ? undefined : "Choose at least one file or folder") },
    onSubmit: (values) => onSubmit(values.paths),
  });
  return (
    <Form
      navigationTitle="Choose Files"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Choose Recipient" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.paths}
        title="Files or Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
      />
    </Form>
  );
}

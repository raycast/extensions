import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";

export function TextForm({
  navigationTitle,
  submitTitle,
  initialText = "",
  onSubmit,
}: {
  navigationTitle: string;
  submitTitle: string;
  initialText?: string;
  onSubmit: (text: string) => void;
}) {
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={Icon.ArrowRight}
            onSubmit={(values: { text: string }) => {
              if (!values.text.trim()) return setError("Type something to send");
              onSubmit(values.text);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        defaultValue={initialText}
        error={error}
        onChange={() => setError(undefined)}
        placeholder="Arrives as a .txt file, like Blip's own Paste."
      />
    </Form>
  );
}

export function FilesForm({ onSubmit }: { onSubmit: (paths: string[]) => void }) {
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Choose Files to Send"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Choose Recipient"
            icon={Icon.ArrowRight}
            onSubmit={(values: { paths: string[] }) => {
              if (!values.paths?.length) return setError("Choose at least one file or folder");
              onSubmit(values.paths);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="paths"
        title="Files or Folders"
        error={error}
        onChange={() => setError(undefined)}
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
      />
    </Form>
  );
}

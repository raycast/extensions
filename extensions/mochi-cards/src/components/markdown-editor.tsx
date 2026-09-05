import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

type MarkdownEditorProps = {
  readonly initialMarkdown: string;
  readonly onSave: (markdown: string) => void;
};

export function MarkdownEditor({ initialMarkdown, onSave }: MarkdownEditorProps) {
  const { pop } = useNavigation();
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [error, setError] = useState<string>();

  async function save(): Promise<void> {
    if (markdown.trim().length === 0) {
      setError("Markdown cannot be empty");
      await showToast({ style: Toast.Style.Failure, title: "Markdown cannot be empty" });
      return;
    }

    onSave(markdown);
    pop();
  }

  return (
    <Form
      navigationTitle="Edit Markdown"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Use Edited Markdown" icon={Icon.Check} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description text="Manual edits disable AI regeneration. You can restore the last generated version from the preview." />
      <Form.TextArea
        id="markdown"
        title="Markdown"
        value={markdown}
        error={error}
        onChange={(value) => {
          setMarkdown(value);
          setError(undefined);
        }}
      />
    </Form>
  );
}

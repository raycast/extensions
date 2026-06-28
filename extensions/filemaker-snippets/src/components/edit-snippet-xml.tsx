import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { EditSnippetProps, FormValues, useFormLogic } from "./edit-snippet";

export default function EditSnippetXML({ snippet, onSubmit }: EditSnippetProps) {
  const { handleSubmit, setSnippetText, snippetText } = useFormLogic({ snippet, onSubmit });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            title="Save Snippet"
            onSubmit={(values) => handleSubmit({ ...snippet, ...values, customXML: true, snippet: values.snippet })}
            icon={Icon.Check}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Raw XML"
              icon={Icon.CopyClipboard}
              content={snippet.snippet}
              shortcut={{ key: "c", modifiers: ["cmd"] }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        text="This is for advanced use only! Only use if you know what you're doing, otherwise you might break the snippet."
        title="WARNING"
      />
      <Form.Separator />
      <Form.TextArea
        title="XML"
        value={snippetText}
        onChange={(value) => setSnippetText(value)}
        id="snippet"
        autoFocus
        info="Copy/Paste this to/from your code editor for a better experience"
      />
    </Form>
  );
}

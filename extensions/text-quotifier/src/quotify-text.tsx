import { Action, ActionPanel, Form } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export default function TextQuotifier() {
  const { value, setValue, isLoading } = useLocalStorage<string>("text-quotifier");

  const quotifiedText = quotifyText(value);

  return (
    <Form
      navigationTitle="Text Quotifier"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy" content={quotifiedText} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Raw"
        placeholder="Enter text to quotify..."
        autoFocus
        value={value || ""}
        onChange={setValue}
      />
      <Form.Description title="Quotified" text={quotifiedText} />
    </Form>
  );
}

function quotifyText(string: string = "") {
  return JSON.stringify(string);
}

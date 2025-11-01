import { Action, ActionPanel, Form } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export default function FormatToJsonValue() {
  const { value, setValue, isLoading } = useLocalStorage<string>("json-format/format-to-json-value");

  const formatted = formatJSONValue(value);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy" content={formatted} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Enter text to format..."
        autoFocus
        value={value || ""}
        onChange={setValue}
      />
      <Form.Description title="Formatted" text={formatted} />
    </Form>
  );
}

function formatJSONValue(string: string = "") {
  return JSON.stringify(string);
}

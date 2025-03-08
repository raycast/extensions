import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState } from "react";

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [formatted, setFormatted] = useState("");

  const formatJson = () => {
    try {
      const parsed = JSON.parse(input);
      const formattedJson = JSON.stringify(parsed, null, 2);
      setFormatted(formattedJson);
      Clipboard.copy(formattedJson);
      showToast({ style: Toast.Style.Success, title: "JSON formatted and copied!" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message: error instanceof Error ? error.message : "",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Format Json" onSubmit={formatJson} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input JSON" value={input} onChange={setInput} />
      {formatted && <Form.TextArea id="output" title="Formatted JSON" value={formatted} />}
    </Form>
  );
}

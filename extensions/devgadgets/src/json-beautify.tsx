import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [beautifiedJSON, setBeautifiedJSON] = useState<string>("");
  const onSubmit = (values: { "json-string": string }) => {
    const parsedJSON = JSON.parse(values["json-string"]);
    const result = JSON.stringify(parsedJSON, null, 2);
    setBeautifiedJSON(result);
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Beautify JSON" onSubmit={onSubmit} />
          <Action.CopyToClipboard title="Copy to clipboard" content={beautifiedJSON} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="json-string" autoFocus={true} title="JSON String" />
      <Form.TextArea id="beautified-json" title="[readonly] Beautified JSON" value={beautifiedJSON} />
    </Form>
  );
}

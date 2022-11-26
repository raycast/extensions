import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [encodedString, setEncodedString] = useState("");
  const [decodedString, setDecodedString] = useState("");
  const encode = (values: { "decoded-string": string }) => {
    setEncodedString(Buffer.from(values["decoded-string"], "utf-8").toString("base64"));
  };
  const decode = (values: { "encoded-string": string }) => {
    setDecodedString(Buffer.from(values["encoded-string"], "utf-8").toString("base64"));
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encode" onSubmit={encode} />
          <Action.SubmitForm title="Decode" onSubmit={decode} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="decoded-string"
        autoFocus={true}
        title="Decoded string"
        value={decodedString}
        onChange={setDecodedString}
      />
      <Form.TextArea id="encoded-string" title="Encoded string" value={encodedString} onChange={setEncodedString} />
    </Form>
  );
}

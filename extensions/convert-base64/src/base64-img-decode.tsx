import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import DecodeImagePreview from "./view/DecodeImagePreview";

export default function Command() {
  const { push } = useNavigation();
  const [input, setInput] = useState("");

  return (
    <Form
      actions={
        <ActionPanel title="Base64">
          <Action
            title="Convert"
            onAction={() => {
              push(<DecodeImagePreview base64={input} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="nameField" title="Base64" placeholder="Enter base64..." value={input} onChange={setInput} />
    </Form>
  );
}

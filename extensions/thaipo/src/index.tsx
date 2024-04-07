import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { mapCharacters } from "./utils/characters-map";

export default function Command() {
  const [value, setValue] = useState<string>("");

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={mapCharacters(value)} />
          </ActionPanel>
        }
      >
        <Form.TextArea id="textArea" title="Text to convert" placeholder="Convert text" onChange={setValue} />
        <Form.Description title="Converted text" text={mapCharacters(value)} />
      </Form>
    </>
  );
}

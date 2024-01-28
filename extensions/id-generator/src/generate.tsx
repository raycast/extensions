import { ActionPanel, Action, Form, showToast, Clipboard, Toast } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Command() {
  const [uuid, setUuid] = useState("");

  const handleGenerateUUID = () => {
    const generatedUUID = uuidv4();
    setUuid(generatedUUID);
    Clipboard.copy(generatedUUID);
    showToast(Toast.Style.Success, "Copied UUID", generatedUUID);
  };

  return (
    <Form
      navigationTitle="UUID Generator"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate UUID" onSubmit={handleGenerateUUID} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="uuid"
        title="Generated UUID:"
        value={uuid}
        placeholder="Generated uuid will appear here"
        onChange={() => {}}
      />
    </Form>
  );
}

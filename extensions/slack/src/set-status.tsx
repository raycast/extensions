import { Action, ActionPanel, Form, showHUD, Toast } from "@raycast/api";
import { useState } from "react";
import { SlackClient, onApiError } from "./shared/client";

export default function Command() {
  const [statusText, setStatusText] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("");

  const handleSubmit = async () => {
    try {
      await SlackClient.setStatus(statusText, statusEmoji);
      await showHUD("Status updated successfully");
    } catch (error) {
      await onApiError({ exitExtension: true });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Status" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="statusText"
        title="Status Text"
        placeholder="Enter your status message"
        value={statusText}
        onChange={setStatusText}
      />
      <Form.TextField
        id="statusEmoji"
        title="Status Emoji"
        placeholder="Enter emoji (e.g., :smile:)"
        value={statusEmoji}
        onChange={setStatusEmoji}
      />
    </Form>
  );
}

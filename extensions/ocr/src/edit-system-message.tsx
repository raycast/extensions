import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import {
  DEFAULT_SYSTEM_MESSAGE,
  getConfiguredSystemMessage,
  resetConfiguredSystemMessage,
  saveConfiguredSystemMessage,
} from "./system-message";

interface FormValues {
  systemMessage: string;
}

interface SystemMessageFormProps {
  onCancel: () => void;
  onSaved: () => void;
}

export function SystemMessageForm({ onCancel, onSaved }: SystemMessageFormProps) {
  const [systemMessage, setSystemMessage] = useState("");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSystemMessage(): Promise<void> {
      setSystemMessage(await getConfiguredSystemMessage());
      setIsLoading(false);
    }

    void loadSystemMessage();
  }, []);

  async function handleSubmit(values: FormValues): Promise<void> {
    const normalizedSystemMessage = values.systemMessage.trim();

    if (!normalizedSystemMessage) {
      setError("Please add some instructions first.");
      return;
    }

    await saveConfiguredSystemMessage(normalizedSystemMessage);
    await showToast({
      style: Toast.Style.Success,
      title: "Instructions saved",
    });
    onSaved();
  }

  async function handleReset(): Promise<void> {
    await resetConfiguredSystemMessage();
    setSystemMessage(DEFAULT_SYSTEM_MESSAGE);
    setError(undefined);
    await showToast({
      style: Toast.Style.Success,
      title: "Instructions reset to default",
    });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Instructions" onSubmit={handleSubmit} />
          <Action
            title="Reset to Default"
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={handleReset}
          />
          <Action title="Cancel" shortcut={{ modifiers: ["cmd"], key: "." }} onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="systemMessage"
        title="OCR Instructions"
        placeholder="Tell the AI how to read and format your screenshots"
        value={systemMessage}
        error={error}
        onChange={(value) => {
          setSystemMessage(value);
          setError(undefined);
        }}
      />
    </Form>
  );
}

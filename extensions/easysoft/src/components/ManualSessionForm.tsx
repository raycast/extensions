import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { setSession } from "../api/auth";

interface ManualSessionFormProps {
  onSessionSet: () => void;
  onCancel: () => void;
}

interface FormValues {
  jsessionId: string;
}

export function ManualSessionForm({ onSessionSet, onCancel }: ManualSessionFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    const { jsessionId } = values;

    if (!jsessionId || !jsessionId.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a JSESSIONID",
      });
      return;
    }

    setIsLoading(true);
    try {
      await setSession(jsessionId.trim());
      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Session set successfully",
      });
      onSessionSet();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Session" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Manual Session Entry"
        text="Copy your JSESSIONID from SchoolSoft (in browser DevTools > Application > Cookies) and paste it here."
      />
      <Form.TextField
        id="jsessionId"
        title="JSESSIONID"
        placeholder="Paste your JSESSIONID here"
        defaultValue=""
        autoFocus
      />
    </Form>
  );
}

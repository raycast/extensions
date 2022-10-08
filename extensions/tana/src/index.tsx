import { Form, ActionPanel, Action, showToast, Toast, showHUD, closeMainWindow } from "@raycast/api";
import { useState } from "react";
import { createNode } from "./api";

type Values = {
  note: string;
};

export default function Command() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: Values) {
    setLoading(true);
    try {
      await createNode(values.note);
      showHUD("✅ Note added successfully");
      await closeMainWindow();
    } catch (error) {
      let message: string | undefined = undefined;
      if (error instanceof Error) {
        message = error.message;
      }
      showToast({
        title: "Failed to send",
        message: message,
        style: Toast.Style.Failure,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="note" title="Note" placeholder="Enter note" />
    </Form>
  );
}

import { useState } from "react";
import { Action, ActionPanel, Form, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { dropText } from "./api";

export default function DropTextCommand() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter some text first",
      });
      return;
    }
    setSubmitting(true);
    try {
      await dropText(trimmed);
      await showHUD("Dropped text to OwnDrop");
      await popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Drop failed",
        message: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Drop Text" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text or URL"
        placeholder="Paste or type text to sync across your devices…"
        value={text}
        onChange={setText}
        autoFocus
      />
    </Form>
  );
}

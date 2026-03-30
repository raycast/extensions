import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { runLoopKeybind } from "./loop-utils";

export default function RunLoopKeybind() {
  const [keybindName, setKeybindName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { keybindName: string }) {
    const trimmedName = values.keybindName.trim();
    if (!trimmedName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a keybind name",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await runLoopKeybind(trimmedName);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Run Loop Keybind"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Keybind" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Run any named Loop keybind you've configured in the app." />
      <Form.TextField
        id="keybindName"
        title="Keybind Name"
        placeholder="Example: Writing Layout"
        value={keybindName}
        onChange={setKeybindName}
      />
    </Form>
  );
}

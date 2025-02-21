import { showHUD, Form, ActionPanel, Action } from "@raycast/api";
import { isFlowInstalled, setSessionTitle } from "./utils";
import { useState } from "react";

export default function SetSessionTitle() {
  const [title, setTitle] = useState("");

  const handleSubmit = async (values: { title: string }) => {
    if (!(await isFlowInstalled())) {
      await showHUD("Flow not installed. Install it from: https://flowapp.info/download");
      return;
    }

    await setSessionTitle(values.title);
    await showHUD(`Session title set to: ${values.title}`);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Title" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Session Title"
        placeholder="Enter the new session title"
        onChange={setTitle}
        value={title}
      />
    </Form>
  );
}

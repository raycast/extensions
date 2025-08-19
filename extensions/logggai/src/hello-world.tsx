import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [value, setValue] = useState("");

  function handleSubmit() {
    showToast({ style: Toast.Style.Success, title: `Hello, ${value || "World"}!` });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Say Hello" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Your Name" value={value} onChange={setValue} />
    </Form>
  );
}

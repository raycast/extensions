import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { createSubscriber } from "./api-client";

export default function CreateSubscriber() {
  const [email, setEmail] = useState("");

  async function handleSubmit() {
    try {
      await createSubscriber(email);
      showToast(Toast.Style.Success, "Subscriber created successfully");
      setEmail("");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to create subscriber");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Subscriber" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" placeholder="Enter subscriber email" value={email} onChange={setEmail} />
    </Form>
  );
}

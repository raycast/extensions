import { ActionPanel, Action, Form, showToast, Toast, open } from "@raycast/api";
import { useState } from "react";

function Command() {
  const [phoneNumber, setPhoneNumber] = useState("");

  async function handleSubmit() {
    // Ensure the phone number is not empty
    if (!phoneNumber.trim()) {
      showToast(Toast.Style.Failure, "Please enter a phone number.");
      return;
    }

    // Open WhatsApp Web
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${encodeURIComponent(phoneNumber)}`;
    await open(whatsappUrl);
    showToast(Toast.Style.Success, "WhatsApp Web is opening...");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open WhatsApp Chat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="phone"
        title="Phone Number"
        placeholder="Enter full phone number with country code"
        value={phoneNumber}
        onChange={setPhoneNumber}
      />
    </Form>
  );
}

export default Command;

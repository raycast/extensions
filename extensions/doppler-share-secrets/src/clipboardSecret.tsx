import { ActionPanel, Form, Action, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import ShareSecretAction from "./components/shareSecretAction";
import ExpireViews from "./components/expireViews";
import ExpireDays from "./components/expireDays";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    async function fetchClipboardText() {
      const text = await Clipboard.readText();
      if (text) {
        setClipboardText(text);
      }
    }
    fetchClipboardText();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <ShareSecretAction />
          <Action.OpenInBrowser url="https://share.doppler.com" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="secret"
        title="Secret"
        value={clipboardText}
        onChange={(newValue) => setClipboardText(newValue)}
        placeholder="Enter sensitive data to securely share..."
      />
      <ExpireViews></ExpireViews>
      <ExpireDays></ExpireDays>
    </Form>
  );
}

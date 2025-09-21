import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { text: string }) {
    const input = values.text;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      const dataUrl = await QRCode.toDataURL(input);
      await Clipboard.copy(dataUrl);
      await showToast(Toast.Style.Success, "QR code data URL copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to generate QR code: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Qr Code" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Enter text for QR code"
        placeholder="https://example.com"
        defaultValue={clipboardText}
      />
    </Form>
  );
}

import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { input: string; direction: string }) {
    const input = values.input;
    const direction = values.direction;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      let result: string;
      if (direction === "epoch-to-date") {
        const timestamp = parseInt(input);
        const date = new Date(timestamp * 1000); // assume seconds
        result = date.toLocaleString();
      } else {
        const date = new Date(input);
        result = Math.floor(date.getTime() / 1000).toString();
      }
      await Clipboard.copy(result);
      await showToast(Toast.Style.Success, "Converted timestamp copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Invalid input: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert Timestamp" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Enter timestamp or date"
        placeholder="1640995200 or 2022-01-01"
        defaultValue={clipboardText}
      />
      <Form.Dropdown id="direction" title="Conversion Direction">
        <Form.Dropdown.Item value="epoch-to-date" title="Epoch to Date" />
        <Form.Dropdown.Item value="date-to-epoch" title="Date to Epoch" />
      </Form.Dropdown>
    </Form>
  );
}

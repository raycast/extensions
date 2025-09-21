import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function unescapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
  };
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (m) => map[m]);
}

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { html: string; action: string }) {
    const input = values.html;
    const action = values.action;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    const result = action === "escape" ? escapeHtml(input) : unescapeHtml(input);
    await Clipboard.copy(result);
    await showToast(Toast.Style.Success, `${action === "escape" ? "Escaped" : "Unescaped"} HTML copied to clipboard`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process HTML" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="html"
        title="Enter HTML"
        placeholder="<div>Hello & welcome</div>"
        defaultValue={clipboardText}
      />
      <Form.Dropdown id="action" title="Action">
        <Form.Dropdown.Item value="escape" title="Escape" />
        <Form.Dropdown.Item value="unescape" title="Unescape" />
      </Form.Dropdown>
    </Form>
  );
}

import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import CleanCSS from "clean-css";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { css: string }) {
    const input = values.css;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      const minified = new CleanCSS().minify(input).styles;
      await Clipboard.copy(minified);
      await showToast(Toast.Style.Success, "Minified CSS copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to minify CSS: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Minify CSS" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="css" title="Enter CSS" placeholder="body { margin: 0; }" defaultValue={clipboardText} />
    </Form>
  );
}

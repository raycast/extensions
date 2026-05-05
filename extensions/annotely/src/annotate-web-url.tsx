import { Action, ActionPanel, Form, open, showToast, Toast, Clipboard, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        setUrl(text);
      }
    });
  }, []);

  async function handleSubmit(values: { url: string }) {
    if (!values.url) {
      showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    try {
      new URL(values.url);
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Invalid URL", message: "Please enter a valid HTTP/HTTPS URL" });
      return;
    }

    try {
      const annotelyUrl = `https://annotely.com/editor?url=${encodeURIComponent(values.url)}`;
      await open(annotelyUrl);
      await closeMainWindow();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to open URL", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Annotely" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Image URL"
        placeholder="https://example.com/image.png"
        value={url}
        onChange={setUrl}
      />
    </Form>
  );
}

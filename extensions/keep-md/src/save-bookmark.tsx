import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { saveBookmark } from "./keep";

export default function Command() {
  const { pop } = useNavigation();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Clipboard.readText()
      .then((text) => {
        if (text && /^https?:\/\//i.test(text.trim())) setUrl(text.trim());
      })
      .catch(() => undefined);
  }, []);

  async function submit() {
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol))
        throw new Error("Unsupported URL scheme");
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a valid HTTP or HTTPS URL",
      });
      return;
    }
    setSaving(true);
    try {
      await saveBookmark(parsed.toString());
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Keep.md",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save bookmark",
        message: String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Keep.md" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/article"
        value={url}
        onChange={setUrl}
      />
    </Form>
  );
}

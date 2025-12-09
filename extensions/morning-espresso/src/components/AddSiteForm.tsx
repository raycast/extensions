import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

interface AddSiteFormProps {
  groupId: string;
  onAdd: (groupId: string, name: string, url: string) => void;
}

export default function AddSiteForm({ groupId, onAdd }: AddSiteFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (!url.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "URL is required",
      });
      return;
    }

    // Add https:// if no protocol is specified
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    // Validate URL
    try {
      new URL(finalUrl);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid URL (e.g., example.com)",
      });
      return;
    }

    const siteName = name.trim() || new URL(finalUrl).hostname;
    onAdd(groupId, siteName, finalUrl);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Site" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Site Name"
        placeholder="e.g., Hacker News (optional)"
        value={name}
        onChange={setName}
      />
      <Form.TextField id="url" title="URL" placeholder="example.com" value={url} onChange={setUrl} />
    </Form>
  );
}

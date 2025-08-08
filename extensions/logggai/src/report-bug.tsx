import { ActionPanel, Form, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

const BUG_TYPES = [
  "Authentication issue",
  "Payment error",
  "UI/UX problem",
  "Performance",
  "Feature not working",
  "Other",
];

export default function Command() {
  const [bugType, setBugType] = useState(BUG_TYPES[0]);
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const { "Session Token": sessionToken } = getPreferenceValues();

  async function handleSubmit(values: { bugType: string; description: string; url: string }) {
    try {
      const res = await fetch("https://logggai.run/api/report-bug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ style: Toast.Style.Success, title: "Bug report sent!" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to send bug report" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Bug Report" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="bugType" title="Bug type" value={bugType} onChange={setBugType}>
        {BUG_TYPES.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={type} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="description" title="Description" value={description} onChange={setDescription} />
      <Form.TextField id="url" title="Page URL" value={url} onChange={setUrl} />
    </Form>
  );
}

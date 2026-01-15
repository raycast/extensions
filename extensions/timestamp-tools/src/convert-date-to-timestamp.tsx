import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [dateString, setDateString] = useState<string>("");
  const [result, setResult] = useState<string>("");

  function convertToTimestamp() {
    if (!dateString) {
      showToast({ title: "Error", message: "Please enter a date" });
      return;
    }

    let date: Date;

    // Handle date-only format (e.g. 2026-01-09)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      date = new Date(`${dateString}T00:00:00`);
    } else {
      // Let JavaScript parse other formats
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      showToast({ title: "Error", message: "Invalid date format" });
      return;
    }

    const timestamp = Math.floor(date.getTime() / 1000);
    setResult(timestamp.toString());
    showToast({ title: "Success", message: "Date converted to timestamp" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={convertToTimestamp} title="Convert Date" />
          <Action.CopyToClipboard content={result} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert human-readable date to Unix timestamp" />
      <Form.TextField
        id="date"
        title="Date String"
        placeholder="Enter date (e.g. 2023-01-15 14:30:00)"
        value={dateString}
        onChange={setDateString}
      />
      <Form.Separator />
      <Form.TextArea id="result" title="Unix Timestamp" value={result} onChange={() => {}} />
    </Form>
  );
}

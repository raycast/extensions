import { Action, ActionPanel, Form, Toast, closeMainWindow, openExtensionPreferences, showToast } from "@raycast/api";
import { useState } from "react";
import { HttpError, sendTask } from "../lib/craft";
import { getPrefs } from "../lib/prefs";

type FormValues = {
  content: string;
};

export default function CaptureTaskCommand() {
  const prefs = getPrefs();
  const [content, setContent] = useState("");

  async function handleSubmit(values: FormValues) {
    const trimmed = values.content.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Enter content" });
      return;
    }

    const now = new Date();
    const craftPosition = prefs.appendPosition;
    const timestamp = prefs.addTimestamp ? formatTime(now, prefs.timeFormat) : "";
    const finalText = timestamp ? `${timestamp} ${trimmed}` : trimmed;
    const targetDate = formatDate(now);

    try {
      await sendTask(finalText, targetDate, craftPosition);
      await showToast({ style: Toast.Style.Success, title: "Saved to Craft" });
      setContent("");
      setTimeout(() => {
        void closeMainWindow();
      }, 350);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: formatError(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Craft" onSubmit={handleSubmit} />
          <Action title="Open Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        value={content}
        onChange={setContent}
        placeholder="Add content to your daily note"
        autoFocus
      />
    </Form>
  );
}

function formatTime(date: Date, format: string): string {
  if (!format.trim()) {
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
  }
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hh = String(((hours + 11) % 12) + 1).padStart(2, "0");
  const HH = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const a = hours < 12 ? "AM" : "PM";

  return format.replace(/HH/g, HH).replace(/hh/g, hh).replace(/mm/g, mm).replace(/a/g, a);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.body) return `Craft ${error.status}: ${error.body}`;
    return `Craft ${error.status}`;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

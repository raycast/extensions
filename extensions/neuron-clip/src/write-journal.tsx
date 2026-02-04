import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getOrCreateJournalEntry, checkJournalEntryExists } from "./utils/api";

/** Format date as YYYY-MM-DD in local time (avoids UTC off-by-one). */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function Command() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [existingForDate, setExistingForDate] = useState<boolean | null>(null);

  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = toLocalDateString(selectedDate);
    setExistingForDate(null);
    checkJournalEntryExists(dateStr)
      .then((result) => {
        setExistingForDate(result.exists);
        if (result.exists) {
          showToast({
            style: Toast.Style.Success,
            title: "Daily note already exists",
            message: "Your note will be appended at the end of that note.",
          });
        }
      })
      .catch(() => setExistingForDate(false));
  }, [selectedDate]);

  async function handleSubmit(values: { date?: Date; content?: string }) {
    const date = values.date ?? selectedDate;
    const content = (values.content ?? "").trim();
    if (!date) {
      showToast({ style: Toast.Style.Failure, title: "Please select a date" });
      return;
    }
    if (existingForDate === true && content.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No content to append",
        message: "Add some text to append to the existing daily note.",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: existingForDate
        ? "Appending to daily note..."
        : "Creating daily note...",
    });
    try {
      const dateStr = toLocalDateString(date);
      const result = await getOrCreateJournalEntry(
        dateStr,
        content || undefined,
      );
      if (result.existing) {
        toast.style = Toast.Style.Success;
        toast.title = "Appended to daily note";
        toast.message = result.title;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Daily note created";
        toast.message = result.title;
      }
      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Daily Note"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="date"
        title="Date"
        value={selectedDate ?? undefined}
        onChange={setSelectedDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextArea
        id="content"
        title="Note"
        placeholder="Write your journal entry..."
        defaultValue=""
      />
    </Form>
  );
}

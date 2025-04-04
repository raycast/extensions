import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { vectorIndex, generateEmbedding, generateId, NoteCategory } from "./utils";

interface ReminderFormValues {
  title: string;
  content: string;
  date: Date | null;
  hour: string;
  minute: string;
}

export default function Command() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: ReminderFormValues) {
    try {
      if (!values.title.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Title is required",
        });
        return;
      }

      setIsSubmitting(true);

      // Format the reminder text
      let reminderText = `Reminder: ${values.title}\n`;

      // Add content if provided
      if (values.content.trim()) {
        reminderText += `\n${values.content}\n`;
      }

      // Add date and time if provided
      if (values.date) {
        const dateString = values.date.toLocaleDateString();
        reminderText += `\nDate: ${dateString}`;

        // Add time if hour and minute are provided
        if (values.hour && values.minute) {
          const timeString = `${values.hour}:${values.minute}`;
          reminderText += ` at ${timeString}`;
        }
      }

      // Generate a vector embedding for the text
      const embedding = generateEmbedding(reminderText);

      // Generate a unique ID for the reminder
      const id = generateId();

      // Extract date and time for metadata
      const dateTime = values.date
        ? {
            date: values.date.toISOString().split("T")[0],
            time: values.hour && values.minute ? `${values.hour}:${values.minute}` : null,
          }
        : null;

      // Build metadata object
      const metadata = {
        text: reminderText,
        title: values.title,
        category: NoteCategory.REMINDER,
        dateTime: dateTime,
        timestamp: new Date().toISOString(),
      };

      // Store the reminder in Upstash Vector
      await vectorIndex.upsert([
        {
          id,
          vector: embedding,
          metadata,
        },
      ]);

      await showToast({
        style: Toast.Style.Success,
        title: "Reminder added",
        message: values.title,
      });

      // Reset form (by forcing a component reload)
      setIsSubmitting(false);
    } catch (error) {
      setIsSubmitting(false);
      console.error(error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to add reminder: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Reminder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter reminder title"
        info="Short title for your reminder"
      />
      <Form.TextArea
        id="content"
        title="Details"
        placeholder="Enter reminder details"
        info="Additional details about your reminder"
      />
      <Form.DatePicker id="date" title="Date" type={Form.DatePicker.Type.Date} info="When to be reminded" />
      <Form.Dropdown id="hour" title="Hour" info="Hour to be reminded">
        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
          <Form.Dropdown.Item
            key={hour}
            value={hour.toString().padStart(2, "0")}
            title={hour.toString().padStart(2, "0")}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="minute" title="Minute" info="Minute to be reminded">
        {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
          <Form.Dropdown.Item
            key={minute}
            value={minute.toString().padStart(2, "0")}
            title={minute.toString().padStart(2, "0")}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

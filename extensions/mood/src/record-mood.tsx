import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { MoodEntry, loadEntries, saveEntries, getMoodEmoji, getMoodTitle, MOODS } from "./lib/data";
import crypto from "crypto";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: Omit<MoodEntry, "id">) {
    setIsSubmitting(true);

    try {
      const newEntry: MoodEntry = {
        id: crypto.randomUUID(),
        mood: values.mood,
        tags: values.tags,
        notes: values.notes,
        date: values.date || new Date(),
      };

      const entries = await loadEntries();

      // Add new entry and save
      entries.unshift(newEntry);
      await saveEntries(entries);

      await showToast({
        style: Toast.Style.Success,
        title: "Mood recorded",
        message: `Feeling ${values.mood}`,
      });

      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to record mood" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Record Mood" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
      enableDrafts
    >
      <Form.Description text="How are you feeling right now?" />

      <Form.Dropdown id="mood" title="Mood" defaultValue="neutral" storeValue>
        {MOODS.map((mood) => (
          <Form.Dropdown.Item key={mood} value={mood} title={getMoodTitle(mood)} icon={getMoodEmoji(mood)} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="tags" title="Tags">
        <Form.TagPicker.Item value="work" title="Work" />
        <Form.TagPicker.Item value="personal" title="Personal" />
        <Form.TagPicker.Item value="family" title="Family" />
        <Form.TagPicker.Item value="health" title="Health" />
        <Form.TagPicker.Item value="exercise" title="Exercise" />
        <Form.TagPicker.Item value="social" title="Social" />
        <Form.TagPicker.Item value="leisure" title="Leisure" />
        <Form.TagPicker.Item value="productivity" title="Productivity" />
        <Form.TagPicker.Item value="stress" title="Stress" />
        <Form.TagPicker.Item value="sleep" title="Sleep" />
        <Form.TagPicker.Item value="other" title="Other" />
      </Form.TagPicker>

      <Form.TextArea id="notes" title="Notes" placeholder="What's on your mind? Any context you want to add?" />

      <Form.DatePicker id="date" title="Date & Time" defaultValue={new Date()} type={Form.DatePicker.Type.DateTime} />
    </Form>
  );
}

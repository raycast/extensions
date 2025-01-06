import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useCallback } from "react";
import { saveJournalEntry } from "./utils/storage";
import type { JournalEntry } from "./types";

const JOURNAL_PROMPTS = [
  "What small act of virtue can I celebrate from today?",
  "Which of today's obstacles turned out to be an opportunity?",
  "What would my wisest self tell me about my current situation?",
  "How did I practice courage today, even in a small way?",
  "What attachment am I ready to let go of?",
  "How can I show more kindness to myself or others today?",
  "What recent hardship has made me stronger?",
  "Which of my reactions today would I like to improve?",
  "What truth am I avoiding that I need to face?",
  "How did I maintain tranquility amid today's chaos?",
  "What simple pleasure am I grateful for right now?",
  "Which Stoic principle did I practice today?",
  "What is within my control in this moment?",
  "How can I turn today's setback into tomorrow's strength?",
  "What unnecessary worry can I release right now?",
];

export default function Command() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [randomPrompt, setRandomPrompt] = useState(JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)]);
  const [textValue, setTextValue] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    async (values: { entry: string }) => {
      if (!values.entry.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Empty Entry",
          message: "Please write something before saving",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const entry: JournalEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          prompt: randomPrompt,
          content: values.entry.trim(),
        };

        await saveJournalEntry(entry);

        await showToast({
          style: Toast.Style.Success,
          title: "Meditation saved",
          message: "Your thoughts have been preserved",
        });

        pop();
        setTextValue("");
        return true;
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save entry",
          message: String(error),
        });
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [pop, randomPrompt],
  );

  const handleClear = () => {
    if (!textValue.trim()) {
      return false; // Don't do anything if the text is empty
    }
    setTextValue("");
    setRandomPrompt(JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)]);
    return true;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Entry"
            onSubmit={handleSubmit}
            icon={isSubmitting ? Icon.Clock : Icon.Document}
          />
          <Action
            title="Clear Entry"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={handleClear}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="entry"
        title="Journal"
        placeholder={randomPrompt}
        enableMarkdown
        autoFocus
        value={textValue}
        onChange={setTextValue}
      />
    </Form>
  );
}

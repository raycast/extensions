import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation, Keyboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { Flashcard } from "./types";
import { saveCard, getAllTags } from "./utils/storage";

interface Props {
  card: Flashcard;
  /** Called after saving to refresh the parent list. */
  onSaved?: () => void;
}

export default function EditTags({ card, onSaved }: Props) {
  const { pop } = useNavigation();

  // Show tags with # prefixes as the default value.
  const [tagInput, setTagInput] = useState(card.tags.map((tg) => `#${tg}`).join(" "));
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Load existing tags from storage as suggestions.
  useEffect(() => {
    getAllTags().then(setExistingTags);
  }, []);

  // Show existing tags in the help text.
  const suggestionsText =
    existingTags.length > 0
      ? "Already used tags:\n" + existingTags.map((tg) => `#${tg}`).join("  ")
      : "No tags created yet. Use `#tag1 #tag2` to get started.";

  async function handleSubmit(values: { tags: string }) {
    // Parse tags separated by spaces or commas, with or without # prefixes.
    // Normalize to lowercase and remove duplicates.
    const raw = values.tags.trim();
    const parsed: string[] =
      raw.length === 0
        ? []
        : [
            ...new Set(
              raw
                .split(/[\s,]+/)
                .map((tg) => tg.replace(/^#/, "").trim().toLowerCase())
                .filter(Boolean),
            ),
          ];

    const updated: Flashcard = { ...card, tags: parsed };

    try {
      await saveCard(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Tags saved!",
        message: parsed.length === 0 ? "All tags removed" : parsed.map((tg) => `#${tg}`).join(" "),
      });
      onSaved?.();
      pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save tags",
        message: String(e),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Edit Tags – ${card.front}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tags" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} shortcut={Keyboard.Shortcut.Common.Pin} onAction={pop} />
        </ActionPanel>
      }
    >
      {/* Card preview */}
      <Form.Description title="Flashcard" text={card.front} />
      <Form.Separator />

      {/* Tag input */}
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="#vokabel #grammatik #unternehmen"
        value={tagInput}
        onChange={setTagInput}
        info="Separate tags with spaces. Prepend a hash symbol (#) to format them nicely."
      />

      {/* Show existing tags as help text */}
      <Form.Description title="Existing Tags" text={suggestionsText} />

      <Form.Separator />

      {/* Syntax hints */}
      <Form.Description
        title="Tips"
        text="Standardize on lowercase alphanumeric characters. Spaces and commas are used as separators. Already created tags can be clicked or typed to reuse."
      />
    </Form>
  );
}

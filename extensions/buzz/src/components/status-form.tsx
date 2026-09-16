import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { EMOJI, emojiSearchTerms, searchEmoji } from "../lib/emoji";

/** The entry for a chosen char, as a 0 or 1 element list, so it can be spread. */
function pinned(char: string) {
  return EMOJI.filter((entry) => entry.char === char);
}

/**
 * The one form behind setting a custom status and creating or editing a
 * preset. It validates and hands the values back; it never publishes and never
 * writes to storage, so the caller decides what submitting means.
 */
export function StatusForm({
  submitTitle,
  initialEmoji,
  initialText,
  onSubmit,
}: {
  submitTitle: string;
  initialEmoji?: string;
  initialText?: string;
  onSubmit: (values: { emoji: string; text: string }) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initialEmoji ?? "");

  // Raycast's own dropdown filtering cannot find these entries (see
  // searchEmoji), so onSearchTextChange takes the query, which implicitly turns
  // the native filter off, and we render the matches ourselves.
  const matches = searchEmoji(query);
  // The chosen emoji stays rendered even when it does not match the query.
  // Without this, typing after picking one drops it from the children and the
  // dropdown loses its value, which would silently blank the emoji when editing
  // an existing preset. It is rendered first, ahead of the matches, so a
  // selection does not sink to the bottom of a filtered list.
  const visible = selected && !matches.some((e) => e.char === selected) ? [...pinned(selected), ...matches] : matches;

  async function handleSubmit(values: { emoji: string; text: string }) {
    const emoji = values.emoji.trim();
    const text = values.text.trim();
    if (!emoji && !text) {
      await showToast({ style: Toast.Style.Failure, title: "Add an emoji or some text" });
      return;
    }
    await onSubmit({ emoji, text });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="emoji"
        title="Emoji"
        defaultValue={initialEmoji ?? ""}
        placeholder="Search by name or keyword"
        onSearchTextChange={setQuery}
        onChange={setSelected}
      >
        <Form.Dropdown.Item value="" title="None" />
        {visible.map((entry) => (
          <Form.Dropdown.Item
            key={entry.shortcode}
            value={entry.char}
            title={`${entry.char}  ${entry.shortcode}`}
            keywords={emojiSearchTerms(entry)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="text" title="Status" placeholder="What's your status?" defaultValue={initialText ?? ""} />
    </Form>
  );
}

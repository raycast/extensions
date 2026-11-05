import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import type { ApiSave } from "pond-api";
import { useState } from "react";
import { saveTitle } from "../lib/display";
import { parseTags } from "../lib/urls";

const NOTE_LIMIT = 8192;

export function NoteForm({ save, onSubmit }: { save: ApiSave; onSubmit: (note: string) => Promise<void> }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle={save.note ? "Edit Note" : "Add Note"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Note"
            icon={Icon.Check}
            onSubmit={async (values: { note: string }) => {
              if (values.note.length > NOTE_LIMIT) return setError(`Keep notes under ${NOTE_LIMIT} characters.`);
              pop();
              await onSubmit(values.note);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Save" text={saveTitle(save)} />
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Why you saved it, or what to do with it"
        defaultValue={save.note ?? ""}
        error={error}
        onChange={() => setError(undefined)}
        enableMarkdown
      />
    </Form>
  );
}

export function TagsForm({ save, onSubmit }: { save: ApiSave; onSubmit: (tags: string[]) => Promise<void> }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle="New Tags"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Tags"
            icon={Icon.Tag}
            onSubmit={async (values: { tags: string }) => {
              const tags = parseTags(values.tags);
              if (!tags.length) return setError("Enter at least one tag.");
              pop();
              await onSubmit(tags);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Save" text={saveTitle(save)} />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="design, reference"
        info="Separate tags with commas."
        error={error}
        onChange={() => setError(undefined)}
        autoFocus
      />
    </Form>
  );
}

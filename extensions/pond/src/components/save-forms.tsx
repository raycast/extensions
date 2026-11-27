import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import type { ApiSave } from "pond-api";
import { useRef } from "react";
import { toError } from "../api/problems";
import { saveTitle } from "../lib/display";
import { parseTags } from "../lib/urls";

const NOTE_LIMIT = 8192;

export function NoteForm({ save, onSubmit }: { save: ApiSave; onSubmit: (note: string) => Promise<boolean> }) {
  const { pop } = useNavigation();
  const pending = useRef(false);
  const { handleSubmit, itemProps } = useForm<{ note: string }>({
    initialValues: { note: save.note ?? "" },
    validation: {
      note: (value) => (value && value.length > NOTE_LIMIT ? `Keep notes under ${NOTE_LIMIT} characters.` : undefined),
    },
    async onSubmit({ note }) {
      if (pending.current) return false;
      pending.current = true;
      try {
        const saved = await onSubmit(note);
        if (saved) pop();
        return saved;
      } finally {
        pending.current = false;
      }
    },
  });

  return (
    <Form
      navigationTitle={save.note ? "Edit Note" : "Add Note"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Save" text={saveTitle(save)} />
      <Form.TextArea
        {...itemProps.note}
        title="Note"
        placeholder="Why you saved it, or what to do with it"
        enableMarkdown
      />
    </Form>
  );
}

export function TagsForm({ save, onSubmit }: { save: ApiSave; onSubmit: (tags: string[]) => Promise<boolean> }) {
  const { pop } = useNavigation();
  const pending = useRef(false);
  const { handleSubmit, itemProps } = useForm<{ tags: string }>({
    initialValues: { tags: "" },
    validation: {
      tags: (value) => {
        try {
          if (!parseTags(value).length) return "Enter at least one tag.";
        } catch (error) {
          return toError(error).message;
        }
      },
    },
    async onSubmit({ tags }) {
      if (pending.current) return false;
      pending.current = true;
      try {
        const saved = await onSubmit(parseTags(tags));
        if (saved) pop();
        return saved;
      } finally {
        pending.current = false;
      }
    },
  });

  return (
    <Form
      navigationTitle="New Tags"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Tags" icon={Icon.Tag} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Save" text={saveTitle(save)} />
      <Form.TextField
        {...itemProps.tags}
        title="Tags"
        placeholder="design, reference"
        info="Separate tags with commas."
        autoFocus
      />
    </Form>
  );
}

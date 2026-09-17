import { failToast } from "@chrismessina/raycast-kit";
import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { updateNote } from "../api/endpoints";
import type { Note } from "../api/types";

export default function NoteEditForm(props: { note: Note; onSaved: () => void }) {
  const { pop } = useNavigation();
  const { note } = props;
  const initialTitle = note.title ?? "";
  const initialContent = note.content_markdown ?? note.content_plaintext ?? "";
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  async function submit() {
    const body: { title?: string; format?: "markdown"; content?: string } = {};
    if (title !== initialTitle) body.title = title;
    if (content !== initialContent) {
      body.format = "markdown";
      body.content = content;
    }
    if (Object.keys(body).length === 0) {
      await showToast(Toast.Style.Success, "No changes");
      pop();
      return;
    }
    const toast = await showToast(Toast.Style.Animated, "Saving");
    try {
      await updateNote(note.id.note_id, body);
      toast.style = Toast.Style.Success;
      toast.title = "Saved";
      props.onSaved();
      pop();
    } catch (error) {
      failToast(toast, error, { title: "Save failed" });
    }
  }

  return (
    <Form
      navigationTitle="Edit Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Changes" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextArea id="content" title="Content" value={content} onChange={setContent} enableMarkdown />
    </Form>
  );
}

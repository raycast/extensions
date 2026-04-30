import { Action, ActionPanel, Detail, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";

import { AuthenticateView } from "./components/authenticate-view";
import { NoteDetailScreen } from "./components/note-detail";
import { getNoteDetail, saveTextNote } from "./lib/api";
import { normalizeGetNoteError } from "./lib/errors";
import { normalizeTagInput } from "./lib/format";
import { NoteDetail as GetNoteDetail } from "./lib/types";
import { useGetNoteCredentials } from "./hooks/use-getnote-credentials";

type FormValues = {
  title: string;
  content: string;
  tags: string;
};

export default function SaveTextNoteCommand() {
  const { credentials, isLoading: isAuthLoading, reload } = useGetNoteCredentials();
  const [result, setResult] = useState<GetNoteDetail | null>(null);

  async function handleSubmit(values: FormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving Text Note",
    });

    try {
      const created = await saveTextNote({
        title: values.title.trim() || undefined,
        content: values.content.trim(),
        tags: normalizeTagInput(values.tags),
      });

      const detail = await getNoteDetail(created.noteId);
      setResult(detail);

      toast.style = Toast.Style.Success;
      toast.title = "Text Note Saved";
      toast.message = detail.title || created.noteId;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Save Text Note";
      toast.message = normalizeGetNoteError(error);
    }
  }

  if (isAuthLoading) {
    return <Detail isLoading markdown="Checking GetNote connection..." />;
  }

  if (!credentials) {
    return <AuthenticateView onConnected={reload} />;
  }

  if (result) {
    return <NoteDetailScreen noteId={result.note_id} initialNote={result} />;
  }

  return (
    <Form
      navigationTitle="Save Text Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to GetNote" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Optional" />
      <Form.TextArea id="content" title="Content" placeholder="Capture an idea, summary, or to-do..." />
      <Form.TextField id="tags" title="Tags" placeholder="Optional. Separate with commas or line breaks" />
    </Form>
  );
}

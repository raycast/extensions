import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createNote } from "./utils/freshservice";
import { isAxiosError } from "axios";

interface AddNoteProps {
  ticketId: number;
  type?: "note" | "reply";
  onNoteAdded?: () => void;
}

interface NoteFormValues {
  body: string;
  private: boolean;
}

export default function AddNote({
  ticketId,
  type = "note",
  onNoteAdded,
}: AddNoteProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const isReply = type === "reply";
  const submitLabel = isReply ? "Send Reply" : "Add Note";
  const submitIcon = isReply ? Icon.Envelope : Icon.Check;
  const defaultPrivate = !isReply;

  async function handleSubmit(values: NoteFormValues) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isReply ? "Sending reply..." : "Adding note...",
    });

    try {
      await createNote(ticketId, values.body, values.private);
      toast.style = Toast.Style.Success;
      toast.title = isReply ? "Reply sent" : "Note added";
      if (onNoteAdded) onNoteAdded();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = isReply ? "Failed to send reply" : "Failed to add note";
      if (isAxiosError(error)) {
        toast.message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        toast.message = error.message;
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitLabel}
            onSubmit={handleSubmit}
            icon={submitIcon}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="body"
        title={isReply ? "Reply" : "Note"}
        placeholder={isReply ? "Type your reply..." : "Type your note here..."}
        enableMarkdown
        autoFocus
      />
      <Form.Checkbox
        id="private"
        label="Private Note"
        defaultValue={defaultPrivate}
      />
    </Form>
  );
}

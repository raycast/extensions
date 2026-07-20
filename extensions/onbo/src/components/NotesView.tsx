import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { updateNotes } from "../utils/applications";

type Props = {
  id: number;
  initialNotes?: string;
  onSaved?: (newNotes: string) => void;
};

type FormValues = {
  notes: string;
};

/**
 * NotesView
 *
 * A small form to edit notes for a saved role.
 * - Prefills notes with initialNotes
 * - Persists via updateNotes on submit
 * - Calls onSaved for optimistic parent updates and navigates back
 */
export default function NotesView({ id, initialNotes = "", onSaved }: Props) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: { notes: initialNotes },
    onSubmit: async (values) => {
      await updateNotes(id, values.notes);
      onSaved?.(values.notes);
      await showToast({ title: "Notes updated", style: Toast.Style.Success });
      pop();
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Notes">
            <Action.SubmitForm title="Save Notes" onSubmit={handleSubmit} />
            <Action title="Reset" onAction={reset} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea title="Notes" placeholder="Enter your notes here..." {...itemProps.notes} />
    </Form>
  );
}

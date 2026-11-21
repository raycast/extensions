import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Alias } from "../utils/list";
import { InvalidApiKeyError, showInvalidApiKeyToast } from "../utils/invalid-key";
import { NOTE_MAX_LENGTH, updateAliasNote } from "../utils/note";

type FormValues = {
  note: string;
};

export const EditNoteForm = ({ alias, onSaved }: { alias: Alias; onSaved: () => void }) => {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { note: alias.note },
    validation: {
      note: (value) => {
        const note = value?.trim() ?? "";

        if (note === "") {
          return "Note can't be empty";
        }

        if (note.length > NOTE_MAX_LENGTH) {
          return `Note must be ${NOTE_MAX_LENGTH} characters or less`;
        }
      },
    },
    onSubmit: async ({ note }) => {
      const toast = await showToast(Toast.Style.Animated, "Saving note", alias.email);

      try {
        await updateAliasNote(alias.email, note.trim());
        toast.style = Toast.Style.Success;
        toast.title = "✅ Note saved";
        onSaved();
        pop();
      } catch (error) {
        if (error instanceof InvalidApiKeyError) {
          await showInvalidApiKeyToast(toast);
          return;
        }

        toast.style = Toast.Style.Failure;
        toast.title = "❌ Error saving note";
        toast.message = error instanceof Error ? error.message : undefined;
      }
    },
  });

  return (
    <Form
      navigationTitle="Edit Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Alias" text={alias.email} />
      <Form.TextField title="Note" placeholder="What is this email for?" autoFocus={true} {...itemProps.note} />
    </Form>
  );
};

import { Action, ActionPanel, Form, Icon, Toast, closeMainWindow, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import { getNoteBody, setNoteBody } from "../api/applescript";
import { useNotes } from "../hooks/useNotes";

type AddTextFormProps = {
  draftValues?: Form.Values;
  noteId?: string;
};

type AddTextFormValues = {
  note: string;
  prepend: boolean;
  text: string;
};

export default function AddTextForm({ draftValues, noteId }: AddTextFormProps) {
  const { data, isLoading, permissionView } = useNotes();
  const { pop } = useNavigation();

  const { itemProps, handleSubmit, reset } = useForm<AddTextFormValues>({
    async onSubmit(values) {
      const noteTitle =
        [...data.pinnedNotes, ...data.unpinnedNotes].find((note) => note.id === values.note)?.title || "Note";

      try {
        await showToast({ style: Toast.Style.Animated, title: `Adding text to "${noteTitle}"` });
        const noteBody = await getNoteBody(values.note);
        const text = values.prepend ? `${values.text}\n\n${noteBody}` : `${noteBody}\n\n${values.text}`;
        await setNoteBody(values.note, text);
        if (noteId) {
          await pop();
        } else {
          await closeMainWindow();
        }
        await showToast({ style: Toast.Style.Success, title: `Added text to "${noteTitle}"` });

        reset({ text: "" });
      } catch (error) {
        await showFailureToast(error, { title: `Failed adding text to "${noteTitle}"` });
      }
    },
    initialValues: {
      note: noteId ?? draftValues?.note ?? "",
      text: draftValues?.text ?? "",
      prepend: draftValues?.prepend ?? false,
    },
    validation: {
      note: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  if (permissionView) {
    return permissionView;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Text to Note" icon={Icon.Plus} />
        </ActionPanel>
      }
      isLoading={isLoading}
      enableDrafts={!noteId}
    >
      <Form.Dropdown {...itemProps.note} title="Note" isLoading={isLoading} storeValue>
        <Form.Dropdown.Section>
          {data.pinnedNotes.map((note) => {
            return <Form.Dropdown.Item key={note.id} title={note.title} value={note.id} icon="notes-icon.png" />;
          })}

          {data.unpinnedNotes.map((note) => {
            return <Form.Dropdown.Item key={note.id} title={note.title} value={note.id} icon="notes-icon.png" />;
          })}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextArea enableMarkdown title="Text" {...itemProps.text} />

      <Form.Checkbox
        {...itemProps.prepend}
        label="Add text at the top"
        info="If checked, the text will be added at the top of the note instead of the bottom"
        storeValue
      />
    </Form>
  );
}

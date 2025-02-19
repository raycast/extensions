import { Action, ActionPanel, Form, Icon, Toast, closeMainWindow, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import { createNote, getSelectedNote, setNoteBody } from "../api";
import { fixNoteFormatting } from "../helpers";

type AddTextFormProps = {
  draftValues?: Form.Values;
};

type AddTextFormValues = {
  note: string;
  text: string;
};

export default function NewNoteForm({ draftValues }: AddTextFormProps) {
  const { pop } = useNavigation();

  const { itemProps, handleSubmit, reset } = useForm<AddTextFormValues>({
    async onSubmit(values) {
      const noteTitle = values.note;

      try {
        let noteId = "";
        const text = `${values.text}`;
        const { noteInHtmlFormat } = fixNoteFormatting(noteTitle, text);

        if (noteTitle) {
          await showToast({ style: Toast.Style.Animated, title: `Creating new note"${noteTitle}"` });
          await createNote(noteTitle);
          noteId = await getSelectedNote();
        } else {
          await closeMainWindow();
        }

        if (noteId) {
          await setNoteBody(noteId, noteInHtmlFormat);
          await pop();
        } else {
          await closeMainWindow();
        }

        await showToast({ style: Toast.Style.Success, title: `Successfully created new note "${noteTitle}"` });
        reset({ text: "" });
      } catch (error) {
        await showFailureToast(error, { title: `Failed to create new note titled "${noteTitle}"` });
      }
    },
    initialValues: {
      note: draftValues?.note ?? "",
      text: draftValues?.text ?? "",
    },
    validation: {
      note: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create New Note" icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.note} title="Note" placeholder="Note Title" />
      <Form.TextArea title="Text" {...itemProps.text} />
    </Form>
  );
}

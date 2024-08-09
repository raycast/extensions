import { Form, Action, ActionPanel, useNavigation, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Note } from "./note";
import validateTag from "./utils";
import { getNotes, saveNotes } from "./notes-store";

function AddNoteAction({ setNotes }: { setNotes: (notes: Note[]) => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<Error | unknown>();

  useEffect(() => {

    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [error]);

  const { handleSubmit, itemProps } = useForm<Note>({
    onSubmit(values: { title: string; description: string; tag: string , clipped: boolean}) {
      try {
        (async () => {
          const allNotes: Note[] = await getNotes();
          const note: Note = {
            title: values.title,
            description: values.description,
            tag: values.tag,
            clipped: values.clipped,
            createdOn: new Date(),
          };
          allNotes.push(note);
          await saveNotes(allNotes);
          setNotes(await getNotes());
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Note successfully created",
          });
        })();
        pop();
      } catch (e) {
        setError(e);
      }
    },

    validation: {
      title: FormValidation.Required,
      tag: (value) => {
        if (value && validateTag(value)) {
          return "Only 1 tag is supported & it cannot contain a space!";
        }
      }
    },
  });

  return (
    <Form
      navigationTitle="Create Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField  title="Title" {...itemProps.title} />
      <Form.TextArea  title="Description" enableMarkdown={true} {...itemProps.description}/>
      <Form.TextField title="Tag" {...itemProps.tag} />
      <Form.Checkbox label="Clipped" {...itemProps.clipped} />
    </Form>
  );
}

export default AddNoteAction;

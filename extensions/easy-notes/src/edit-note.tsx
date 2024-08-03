import { Form, Action, ActionPanel, useNavigation, Icon, Color } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Note } from "./note";
import validateTag from "./utils";
import React from "react";

function EditNoteAction(props: { note: Note; onEdit: (updatedNote: Note) => void }) {
  return (
    <Action.Push
      icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
      title="Edit Note"
      target={<EditNoteForm note={props.note} onEdit={props.onEdit} />}
    />
  );
}

function EditNoteForm(props: { note: Note; onEdit: (updatedNote: Note) => void }): React.ReactElement {
  const { onEdit, note } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Note>({
    onSubmit(updatedNote: Note) {
      updatedNote.createdOn = note.createdOn;
      onEdit(updatedNote);
      pop();
    },
    initialValues: note,
    validation: {
      title: FormValidation.Required,
      description: FormValidation.Required,
      tag: (value) => {
        if (value && validateTag(value)) {
          return "Only 1 tag is supported & it cannot contain a space!";
        }
      }
    },
  });

  return (
    <Form
      navigationTitle="Edit Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.TextArea title="Description" enableMarkdown={true} {...itemProps.description} />
      <Form.TextField title="Tag" {...itemProps.tag} />
      <Form.Checkbox label="Clipped" {...itemProps.clipped} />
    </Form>
  );
}

export default EditNoteAction;

import { Action, ActionPanel, Form } from "@raycast/api";
import { EntryType } from "../api";
import { useState } from "react";

export interface FormData {
  notes: string;
  date: Date;
  type: EntryType;
  description?: string;
}

interface NoteFormProps {
  initialData?: FormData;
  onSubmit: (data: FormData) => void;
}

const defaultData: FormData = {
  notes: "",
  date: new Date(),
  type: EntryType.Note,
  description: "",
};

export function NoteForm(props: NoteFormProps) {
  const { onSubmit, initialData = defaultData } = props;

  const [noteErr, setNoteErr] = useState("");
  const submitHandler = async (data: FormData) => {
    if (!data.notes) {
      setNoteErr("Please enter a note");
      return;
    }
    onSubmit(data);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={submitHandler} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new stand-up note" />
      <Form.TextField
        defaultValue={initialData.notes}
        onChange={() => {
          setNoteErr("");
        }}
        error={noteErr}
        id="notes"
        title="Note"
      />
      <Form.TextArea defaultValue={initialData.description} id="description" title="Description" />
      <Form.DatePicker id="date" title="Date" defaultValue={initialData.date} />
      <Form.Dropdown title="Note Type" id={"type"} defaultValue={initialData.type}>
        <Form.Dropdown.Item value={EntryType.Note} title="Note" />
        <Form.Dropdown.Item value={EntryType.Meeting} title="Meeting" />
        <Form.Dropdown.Item value={EntryType.Blocker} title="Blocker" />
      </Form.Dropdown>
    </Form>
  );
}

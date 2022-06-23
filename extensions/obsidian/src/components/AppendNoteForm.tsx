import { ActionPanel, Form, Action, useNavigation, showToast, Toast } from "@raycast/api";
import fs from "fs";

interface Note {
  title: string;
  key: number;
  path: string;
}

interface FormValue {
  content: string;
}

export function AppendNoteForm(props: { note: Note }) {
  const note = props.note;
  const { pop } = useNavigation();

  function addTextToNote(text: FormValue) {
    fs.appendFileSync(note.path, "\n" + text.content);
    showToast({ title: "Added text to note", style: Toast.Style.Success });
    pop();
  }

  return (
    <Form
      navigationTitle={"Add text to: " + note.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={addTextToNote} />
        </ActionPanel>
      }
    >
      <Form.TextArea title={"Add text to:\n" + note.title} id="content" placeholder={"Text"} />
    </Form>
  );
}

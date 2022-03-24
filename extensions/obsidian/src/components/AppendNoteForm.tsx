import { ActionPanel, Form, SubmitFormAction, useNavigation, showToast, ToastStyle } from "@raycast/api";
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
    fs.appendFileSync(note.path, "\n\n" + text.content);
    showToast(ToastStyle.Success, "Added text to note");
    pop();
  }

  return (
    <Form
      navigationTitle={"Add text to: " + note.title}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit" onSubmit={addTextToNote} />
        </ActionPanel>
      }
    >
      <Form.TextArea title={"Add text to:\n" + note.title} id="content" placeholder={"Text"} />
    </Form>
  );
}

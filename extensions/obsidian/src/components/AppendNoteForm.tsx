import { ActionPanel, Form, Action, useNavigation, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { NoteAction } from "../utils/constants";
import { Note } from "../utils/interfaces";
import { applyTemplates } from "../utils/utils";

interface FormValue {
  content: string;
}

export function AppendNoteForm(props: { note: Note; actionCallback: (action: NoteAction) => void }) {
  const note = props.note;
  const { pop } = useNavigation();

  async function addTextToNote(text: FormValue) {
    const content = await applyTemplates(text.content);
    fs.appendFileSync(note.path, "\n" + content);
    showToast({ title: "Added text to note", style: Toast.Style.Success });
    pop();
    props.actionCallback(NoteAction.Append);
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

import { ActionPanel, Form, Action, useNavigation, showToast, Toast, Icon, confirmAlert } from "@raycast/api";
import fs from "fs";
import { NoteAction } from "../utils/constants";
import { Note } from "../utils/interfaces";
import { applyTemplates, getNoteFileContent } from "../utils/utils";

interface FormValue {
  content: string;
}

export function EditNote(props: { note: Note; actionCallback: (action: NoteAction) => void }) {
  const note = props.note;
  const { pop } = useNavigation();

  async function writeToNote(form: FormValue) {
    let content = form.content;
    content = await applyTemplates(content);

    const options = {
      title: "Override note",
      message: 'Are you sure you want to override the note: "' + note.title + '"?',
      icon: Icon.ExclamationMark,
    };
    if (await confirmAlert(options)) {
      fs.writeFileSync(note.path, content);
      showToast({ title: "Edited note", style: Toast.Style.Success });
      props.actionCallback(NoteAction.Edit);
      pop();
    }
  }

  return (
    <Form
      navigationTitle={"Edit: " + note.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={writeToNote} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title={"Edit:\n" + note.title}
        id="content"
        placeholder={"Text"}
        defaultValue={getNoteFileContent(note.path, false)}
      />
    </Form>
  );
}

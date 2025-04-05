import { ActionPanel, Form, Action, useNavigation, showToast, Toast, Icon, confirmAlert } from "@raycast/api";
import fs from "fs";
import { applyTemplates } from "../api/templating/templating.service";
import { Note } from "../api/vault/notes/notes.types";
import { Vault } from "../api/vault/vault.types";
import { NoteReducerAction, NoteReducerActionType } from "../utils/reducers";

interface FormValue {
  content: string;
}

export function EditNote(props: { note: Note; vault: Vault; dispatch: (action: NoteReducerAction) => void }) {
  const { note, vault } = props;
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
      props.dispatch({ type: NoteReducerActionType.Update, payload: { note: note, vault: vault } });
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
        enableMarkdown={true}
        defaultValue={note.content}
      />
    </Form>
  );
}

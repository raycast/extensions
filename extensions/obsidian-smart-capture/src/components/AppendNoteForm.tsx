import { ActionPanel, Form, Action, useNavigation, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { NoteReducerAction, NoteReducerActionType } from "../utils/data/reducers";
import { Note, Vault } from "../utils/interfaces";
import { SearchNotePreferences } from "../utils/preferences";
import { applyTemplates } from "../utils/utils";

interface FormValue {
  content: string;
}

export function AppendNoteForm(props: { note: Note; vault: Vault; dispatch: (action: NoteReducerAction) => void }) {
  const { note, vault, dispatch } = props;
  const { pop } = useNavigation();

  const { appendTemplate } = getPreferenceValues<SearchNotePreferences>();

  async function addTextToNote(text: FormValue) {
    const content = await applyTemplates(text.content);
    fs.appendFileSync(note.path, "\n" + content);
    showToast({ title: "Added text to note", style: Toast.Style.Success });
    dispatch({ type: NoteReducerActionType.Update, payload: { note: note, vault: vault } });
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
      <Form.TextArea
        title={"Add text to:\n" + note.title}
        id="content"
        placeholder={"Text"}
        defaultValue={appendTemplate}
      />
    </Form>
  );
}

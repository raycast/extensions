import { ActionPanel, Form, Action, useNavigation, showToast, Toast, Icon, confirmAlert } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import { NoteAction } from "../utils/constants";
import { Note, Vault } from "../utils/interfaces";
import { applyTemplates, getNoteFileContent } from "../utils/utils";

interface FormValue {
  content: string;
}

export function EditNote(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const { note, vault, actionCallback } = props;
  const { pop } = useNavigation();
  const [defaultContent, setDefaultContent] = useState(getNoteFileContent(note.path, false));

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
      actionCallback(NoteAction.Edit);
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
        defaultValue={defaultContent}
      />
    </Form>
  );
}

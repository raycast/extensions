import { Note, NoteWithContent, ObsidianVault } from "@/obsidian";
import { Action, ActionPanel, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import fs from "fs";
import { updateNoteInCache } from "../api/cache/cache.service";
import { Logger } from "../api/logger/logger.service";
import { applyTemplates } from "../api/templating/templating.service";

const logger = new Logger("EditNote");

interface FormValue {
  content: string;
}

export function EditNote(props: {
  note: NoteWithContent;
  vault: ObsidianVault;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
}) {
  const { note, vault, onNoteUpdated } = props;
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
      logger.info(`Writing content to note: ${note.path}`);
      fs.writeFileSync(note.path, content);

      // Update cache and notify parent
      const stats = fs.statSync(note.path);
      const updates = { lastModified: stats.mtime };
      logger.info(`Updating cache and notifying parent for: ${note.path}`);
      updateNoteInCache(vault.path, note.path, updates);
      onNoteUpdated?.(note.path, updates);

      showToast({ title: "Edited note", style: Toast.Style.Success });
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

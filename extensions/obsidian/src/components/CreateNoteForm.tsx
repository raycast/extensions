import { ObsidianVault } from "@/obsidian";
import { Action, ActionPanel, closeMainWindow, Form, getPreferenceValues, Keyboard, popToRoot } from "@raycast/api";
import { invalidateNotesCache } from "../api/cache/cache.service";
import { createNote, CreateNoteParams } from "../api/create-note";
import { parseFolderActionsPreferences, parseTagsPreferences } from "../api/preferences/preferences.service";
import { NoteFormPreferences } from "../utils/preferences";

export function CreateNoteForm(props: { vault: ObsidianVault; showTitle: boolean }) {
  const { vault, showTitle } = props;

  const pref = getPreferenceValues<NoteFormPreferences>();
  const { prefTag, prefPath } = pref;

  const folderActions = parseFolderActionsPreferences(pref.folderActions);
  const tags = parseTagsPreferences(pref.tags);
  if (prefTag) {
    tags.push(prefTag);
  }

  async function createNewNote(params: CreateNoteParams, path?: string) {
    if (path) {
      params.path = path;
    }
    const saved = await createNote(vault, params);
    if (saved) {
      // Invalidate cache so new note appears in lists
      invalidateNotesCache(vault.path);
    }
    popToRoot();
    closeMainWindow();
  }

  return (
    <Form
      navigationTitle={showTitle ? "Create Note for " + vault.name : ""}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={createNewNote} />
          {folderActions.map((folder, index) => (
            <Action.SubmitForm
              title={"Create in " + folder}
              onSubmit={(props: CreateNoteParams) => createNewNote(props, folder)}
              key={index}
              shortcut={{ modifiers: ["shift", "cmd"], key: index.toString() as Keyboard.KeyEquivalent }}
            ></Action.SubmitForm>
          ))}
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        id="name"
        placeholder="Name of note"
        defaultValue={pref.fillFormWithDefaults ? pref.prefNoteName : ""}
      />
      <Form.TextField
        title="Path"
        id="path"
        defaultValue={prefPath ? prefPath : ""}
        placeholder="path/to/note (optional)"
      />
      <Form.TagPicker id="tags" title="Tags" defaultValue={prefTag ? [prefTag] : []}>
        {tags.map((tag, index) => (
          <Form.TagPicker.Item value={tag} title={tag} key={index} />
        ))}
      </Form.TagPicker>
      <Form.TextArea
        title="Content:"
        id="content"
        placeholder={"Text"}
        defaultValue={pref.fillFormWithDefaults ? pref.prefNoteContent ?? "" : ""}
        autoFocus={pref.focusContentArea}
      />
    </Form>
  );
}

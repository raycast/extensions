import { ActionPanel, Form, Action, getPreferenceValues, Keyboard, popToRoot, closeMainWindow } from "@raycast/api";
import { renewCache } from "../api/cache/cache.service";
import { createNote } from "../api/vault/notes/notes.service";
import { CreateNoteParams } from "../api/vault/notes/notes.types";
import { Vault } from "../api/vault/vault.types";
import { NoteFormPreferences } from "../utils/preferences";

export function CreateNoteForm(props: { vault: Vault; showTitle: boolean }) {
  const { vault, showTitle } = props;

  const pref = getPreferenceValues<NoteFormPreferences>();
  const { folderActions, tags, prefTag, prefPath } = pref;

  function parseFolderActions() {
    if (folderActions) {
      const folders = folderActions
        .split(",")
        .filter((folder) => !!folder)
        .map((folder: string) => folder.trim());
      return folders;
    }
    return [];
  }

  function parseTags() {
    if (!tags) {
      if (prefTag) {
        return [{ name: prefTag, key: prefTag }];
      }
      return [];
    }
    const parsedTags = tags
      .split(",")
      .map((tag) => ({ name: tag.trim(), key: tag.trim() }))
      .filter((tag) => !!tag);
    if (prefTag) {
      parsedTags.push({ name: prefTag, key: prefTag });
    }
    return parsedTags;
  }

  async function createNewNote(params: CreateNoteParams, path: string | undefined = undefined) {
    if (path !== undefined) {
      params.path = path;
    }
    const saved = await createNote(vault, params);
    if (saved) {
      renewCache(vault);
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
          {parseFolderActions()?.map((folder, index) => (
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
        {parseTags()?.map((tag) => (
          <Form.TagPicker.Item value={tag.name} title={tag.name} key={tag.key} />
        ))}
      </Form.TagPicker>
      <Form.TextArea
        title="Content:"
        id="content"
        placeholder={"Text"}
        defaultValue={pref.fillFormWithDefaults ? pref.prefNoteContent ?? "" : ""}
      />
    </Form>
  );
}

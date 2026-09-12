import { ActionPanel, Form, Action, useNavigation, getPreferenceValues, Keyboard } from "@raycast/api";

import NoteCreator from "../utils/data/creator";
import { FormValue, Vault } from "../utils/interfaces";
import { renewCache } from "../utils/data/cache";
import { NoteFormPreferences } from "../utils/preferences";

export function CreateNoteForm(props: { vault: Vault; showTitle: boolean }) {
  const { vault, showTitle } = props;
  const { pop } = useNavigation();

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

  async function createNewNote(noteProps: FormValue, path: string | undefined = undefined) {
    if (path !== undefined) {
      noteProps.path = path;
    }
    const nc = new NoteCreator(noteProps, vault, pref);
    const saved = nc.createNote();
    if (await saved) {
      renewCache(vault);
    }
    pop();
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
              onSubmit={(props: FormValue) => createNewNote(props, folder)}
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
          <Form.TagPicker.Item value={tag.name.toLowerCase()} title={tag.name} key={tag.key} />
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

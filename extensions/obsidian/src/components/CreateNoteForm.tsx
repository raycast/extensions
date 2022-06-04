import { ActionPanel, Form, Action, useNavigation, getPreferenceValues } from "@raycast/api";

import NoteCreator from "../utils/NoteCreator";
import { NoteFormPreferences, FormValue } from "../utils/interfaces";
import { KeyEquivalent } from "@raycast/api/types/api/app/keyboard";

function prefPath(): string {
  const pref: NoteFormPreferences = getPreferenceValues();
  const prefPath = pref.prefPath;
  if (prefPath) {
    return prefPath;
  }
  return "";
}

function prefTag(): string[] {
  const pref: NoteFormPreferences = getPreferenceValues();
  const prefTag = pref.prefTag;
  if (prefTag) {
    return [prefTag];
  }
  return [];
}

function tags() {
  const pref: NoteFormPreferences = getPreferenceValues();
  const tagsString = pref.tags;
  const prefTag = pref.prefTag;
  if (!tagsString) {
    if (prefTag) {
      return [{ name: prefTag, key: prefTag }];
    }
    return [];
  }
  const tags = tagsString
    .split(",")
    .map((tag) => ({ name: tag.trim(), key: tag.trim() }))
    .filter((tag) => !!tag);
  if (prefTag) {
    tags.push({ name: prefTag, key: prefTag });
  }
  return tags;
}

function folders() {
  const pref: NoteFormPreferences = getPreferenceValues();
  const folderString = pref.folderActions;
  if (folderString) {
    const folders = folderString
      .split(",")
      .filter((folder) => !!folder)
      .map((folder: string) => folder.trim());
    return folders;
  }
  return [];
}

export function CreateNoteForm(props: { vaultPath: string }) {
  const vaultPath = props.vaultPath;
  const pref: NoteFormPreferences = getPreferenceValues();
  const { pop } = useNavigation();

  function createNewNote(noteProps: FormValue, path: string | undefined = undefined) {
    if (path !== undefined) {
      noteProps.path = path;
    }
    const nc = new NoteCreator(noteProps, vaultPath, pref.openOnCreate);
    const saved = nc.createNote();
    if (saved) {
      pop();
    }
  }

  return (
    <Form
      navigationTitle={"Create Note"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={createNewNote} />
          {folders()?.map((folder, index) => (
            <Action.SubmitForm
              title={"Create in " + folder}
              onSubmit={(props: FormValue) => createNewNote(props, folder)}
              key={index}
              shortcut={{ modifiers: ["shift", "cmd"], key: index.toString() as KeyEquivalent }}
            ></Action.SubmitForm>
          ))}
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" id="name" placeholder="Name of note" />
      <Form.TextField title="Path" id="path" defaultValue={prefPath()} placeholder="path/to/note (optional)" />
      <Form.TagPicker id="tags" title="Tags" defaultValue={prefTag()}>
        {tags()?.map((tag) => (
          <Form.TagPicker.Item value={tag.name.toLowerCase()} title={tag.name} key={tag.key} />
        ))}
      </Form.TagPicker>
      <Form.TextArea title="Content:" id="content" placeholder={"Text"} />
    </Form>
  );
}

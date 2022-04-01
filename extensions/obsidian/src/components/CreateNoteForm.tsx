import { ActionPanel, Form, Action, useNavigation, getPreferenceValues } from "@raycast/api";

import NoteCreator from "../NoteCreator";
import { NoteFormPreferences, FormValue } from "../interfaces";

function prefPath(): string {
  const pref: NoteFormPreferences = getPreferenceValues();
  const prefPath = pref.prefPath;
  if (prefPath) {
    return prefPath;
  }
  return "";
}

function prefTag(): Array<string> {
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

export function CreateNoteForm(props: { vaultPath: string }) {
  const vaultPath = props.vaultPath;
  const { pop } = useNavigation();

  function createNewNote(noteProps: FormValue) {
    const nc = new NoteCreator(noteProps, vaultPath);
    const saved = nc.createNote();
    if (saved) {
      pop();
    }
  }

  return (
    <Form
      navigationTitle={"Create new Note"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={createNewNote} />
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

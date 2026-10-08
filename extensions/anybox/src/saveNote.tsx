import { ActionPanel, Action, Form, Clipboard, Icon, useNavigation, getPreferenceValues, open } from "@raycast/api";
import { postAndCloseMainWindow, fetchTags, fetchFolders } from "./utilities/fetch";
import { useState, useEffect } from "react";

interface TagProp {
  id: string;
  name: string;
}

interface FolderProp {
  id: string;
  name: string;
}

interface SaveNoteResponse {
  code: number;
  message: string;
  url: string;
}

function NoteForm() {
  const preferences = getPreferenceValues<Preferences.SaveNote>();
  const [note, setNote] = useState<string>();
  const [comment, setComment] = useState<string>();
  const [tags, setTags] = useState<TagProp[]>([]);
  const [folders, setFolders] = useState<FolderProp[]>([]);

  // Form.Dropdown will select first item if no default value is set.
  // To workaround this, we add an empty item.
  // But we also want to hide the empty item from the dropdown.
  // So we add this state to hide the item when Dropdown is focused.
  const [isFolderPlaceholderHidden, setHidden] = useState<boolean>(false);
  const { pop } = useNavigation();

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (typeof text === "string") {
        if (preferences.autoFill) {
          setNote(text);
        }
      }
    });
    fetchTags().then((tags) => {
      if (Array.isArray(tags)) {
        setTags(tags);
      }
    });
    fetchFolders().then((folders) => {
      if (Array.isArray(folders)) {
        setFolders(folders);
      }
    });
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Anybox"
            icon={Icon.SaveDocument}
            onSubmit={async (values) => {
              const note = values.note;
              if (note.length > 0) {
                const data = {
                  note,
                  comment: values.comment,
                  tags: values.tags,
                  folder: values.folder,
                  starred: !!values.starred,
                };
                await postAndCloseMainWindow("save", data);
                pop();
              }
            }}
          />
          <Action.SubmitForm
            title="Save and Open in Anybox"
            icon={Icon.ArrowNe}
            onSubmit={async (values) => {
              const note = values.note;
              if (note.length > 0) {
                const data = {
                  note,
                  comment: values.comment,
                  tags: values.tags,
                  folder: values.folder,
                  starred: !!values.starred,
                };
                const result = (await postAndCloseMainWindow("save", data)) as SaveNoteResponse;
                if (result.url) {
                  open(result.url);
                }
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Note" id="note" value={note} onChange={setNote} />
      <Form.TextField title="Comment" id="comment" value={comment} onChange={setComment} />
      <Form.TagPicker id="tags" title="Tags" defaultValue={[]}>
        {tags.map((val) => {
          return <Form.TagPicker.Item value={val.id} title={val.name} key={val.id} />;
        })}
      </Form.TagPicker>
      <Form.Dropdown
        onFocus={() => {
          setHidden(true);
        }}
        id="folder"
        title="Folder"
        defaultValue=""
      >
        {!isFolderPlaceholderHidden && <Form.Dropdown.Item value="" title="" />}
        {folders.map((val) => {
          return <Form.Dropdown.Item value={val.id} title={val.name} key={val.id} />;
        })}
      </Form.Dropdown>
      <Form.Checkbox id="starred" label="Starred" defaultValue={false} />
    </Form>
  );
}

export default function Command() {
  return <NoteForm></NoteForm>;
}

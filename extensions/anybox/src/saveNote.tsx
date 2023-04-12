import { ActionPanel, Action, Form, Clipboard, Icon, useNavigation, getPreferenceValues } from "@raycast/api";
import { postAndCloseMainWindow, fetchCollections } from "./utilities/fetch";
import { useState, useEffect } from "react";

interface CollectionProp {
  id: string;
  name: string;
  heading?: string;
}

interface Preferences {
  autoFill: boolean;
}

function NoteForm() {
  const preferences = getPreferenceValues<Preferences>();
  const [note, setNote] = useState<string>();
  const [collections, setCollections] = useState<CollectionProp[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (typeof text === "string") {
        if (preferences.autoFill) {
          setNote(text);
        }
      }
    });
    fetchCollections().then((tags) => {
      if (Array.isArray(tags)) {
        setCollections(tags);
      }
    });
  }, []);

  function collectionTitle(tag: CollectionProp) {
    if (tag.heading) {
      return `${tag.heading} > ${tag.name}`;
    }
    return `${tag.name}`;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Anybox"
            icon={Icon.SaveDocument}
            onSubmit={(values) => {
              const note = values.note;
              if (note.length > 0) {
                const data = {
                  note,
                  collections: values.collections,
                  starred: !!values.starred,
                };
                pop();
                postAndCloseMainWindow("save", data);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Note" id="note" value={note} onChange={setNote} />
      <Form.TagPicker id="collections" title="Collections" defaultValue={[]}>
        {collections.map((val) => {
          return <Form.TagPicker.Item value={val.id} title={collectionTitle(val)} key={val.id} />;
        })}
      </Form.TagPicker>
      <Form.Checkbox id="starred" label="Starred" defaultValue={false} />
    </Form>
  );
}

export default function Command() {
  return <NoteForm></NoteForm>;
}

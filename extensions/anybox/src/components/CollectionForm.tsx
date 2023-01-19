import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { postAndCloseMainWindow, fetchCollections } from "../utilities/fetch";
import { useState, useEffect } from "react";

interface CollectionProp {
  id: string;
  name: string;
  heading?: string;
}

interface Props {
  command: string;
  title: string;
}

interface CollectionProp {
  id: string;
  name: string;
  heading?: string;
}

export default function CollectionsForm(props: Props) {
  const [starred] = useState<boolean>(false);
  const [collections, setCollections] = useState<CollectionProp[]>([]);
  const { pop } = useNavigation();
  const command = props.command;
  const title = props.title;

  useEffect(() => {
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
            title={title}
            icon={Icon.SaveDocument}
            onSubmit={(values) => {
              const data = {
                collections: values.collections,
                starred: !!values.starred,
              };
              pop();
              postAndCloseMainWindow(command, data);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="collections" title="Collections" defaultValue={[]}>
        {collections.map((val) => {
          return <Form.TagPicker.Item value={val.id} title={collectionTitle(val)} key={val.id} />;
        })}
      </Form.TagPicker>
      <Form.Checkbox id="starred" label="Starred" defaultValue={starred} />
    </Form>
  );
}

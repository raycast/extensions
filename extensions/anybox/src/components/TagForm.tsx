import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { postAndCloseMainWindow, fetchTags } from "../utilities/fetch";
import { useState, useEffect } from "react";

interface TagProp {
  id: string;
  name: string;
}

interface Props {
  command: string;
  title: string;
}

export default function TagForm(props: Props) {
  const [starred] = useState<boolean>(false);
  const [tags, setTags] = useState<TagProp[]>([]);
  const [comment, setComment] = useState<string>();
  const { pop } = useNavigation();
  const command = props.command;
  const title = props.title;

  useEffect(() => {
    fetchTags().then((tags) => {
      if (Array.isArray(tags)) {
        setTags(tags);
      }
    });
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={title}
            icon={Icon.SaveDocument}
            onSubmit={async (values) => {
              const data = {
                comment: values.comment,
                tags: values.tags,
                starred: !!values.starred,
              };
              await postAndCloseMainWindow(command, data);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="tags" title="Tags" defaultValue={[]}>
        {tags.map((val) => {
          return <Form.TagPicker.Item value={val.id} title={val.name} key={val.id} />;
        })}
      </Form.TagPicker>
      <Form.TextField title="Comment" id="comment" value={comment} onChange={setComment} />
      <Form.Checkbox id="starred" label="Starred" defaultValue={starred} />
    </Form>
  );
}

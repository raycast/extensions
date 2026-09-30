import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { postAndCloseMainWindow, fetchFolders } from "../utilities/fetch";
import { useState, useEffect } from "react";

interface FolderProp {
  id: string;
  name: string;
}

interface Props {
  command: string;
  title: string;
}

export default function FolderForm(props: Props) {
  const [starred] = useState<boolean>(false);
  const [folders, setFolders] = useState<FolderProp[]>([]);
  const [comment, setComment] = useState<string>();
  const { pop } = useNavigation();
  const command = props.command;
  const title = props.title;

  useEffect(() => {
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
            title={title}
            icon={Icon.SaveDocument}
            onSubmit={async (values) => {
              const data = {
                folder: values.folder,
                starred: !!values.starred,
                comment: values.comment,
              };
              await postAndCloseMainWindow(command, data);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown autoFocus id="folder" title="Folder" defaultValue="">
        {folders.map((val) => {
          return <Form.Dropdown.Item value={val.id} title={val.name} key={val.id} />;
        })}
      </Form.Dropdown>
      <Form.TextField title="Comment" id="comment" value={comment} onChange={setComment} />
      <Form.Checkbox id="starred" label="Starred" defaultValue={starred} />
    </Form>
  );
}

import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { GoogleDoc } from "../google_fns";
import { getOriginalNoteName } from "../util";
import { useState } from "react";
import { CreateNewFileForm } from "./create_new_file";

export function ListDocs(props: {
  defaultDoc: GoogleDoc;
  onDefaultDocChange: (doc: GoogleDoc) => void;
  docs: Array<GoogleDoc>;
  onNewFileCreation: (file: GoogleDoc) => void;
}) {
  const [defaultDoc, setDefaultDoc] = useState<GoogleDoc>(props.defaultDoc);
  const [componentDocs, setComponentDocs] = useState<Array<GoogleDoc>>(props.docs);
  const { onDefaultDocChange } = props;

  function handleNewFileCreation(file: GoogleDoc) {
    setComponentDocs([file, ...componentDocs]);
    props.onNewFileCreation(file);
  }

  function CreateNewFileAction() {
    return (
      <Action.Push
        icon={Icon.NewDocument}
        title="Create New Doc"
        target={<CreateNewFileForm onNewFileCreation={handleNewFileCreation} />}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
    );
  }

  function NoteListItemActions(props: { file: GoogleDoc }) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Set as Default"
            icon={{ source: Icon.StarCircle }}
            onAction={() => {
              onDefaultDocChange(props.file);
              setDefaultDoc(props.file);
            }}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.OpenInBrowser url={"https://docs.google.com/document/d/" + props.file.id} />
        </ActionPanel.Section>
        <CreateNewFileAction />
      </ActionPanel>
    );
  }

  function getListItemTitle(file: GoogleDoc) {
    return getOriginalNoteName(file.name) + (file.name === defaultDoc?.name ? " (Default)" : "");
  }

  return (
    <List>
      {componentDocs?.map((file) => (
        <List.Item
          key={file.id}
          title={getListItemTitle(file)}
          actions={<NoteListItemActions file={file} />}
          accessories={[{ text: `Last modified: ${file.modifiedTime}` }]}
        />
      ))}
    </List>
  );
}

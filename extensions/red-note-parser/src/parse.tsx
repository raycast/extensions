import { useEffect, useState } from "react";
import { Action, ActionPanel, List, openExtensionPreferences, showToast, Toast, useNavigation } from "@raycast/api";
import client from "./client.js";
import DetailInfo from "./detail-info.js";

export default function Command() {
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
  const [noteId, setNoteId] = useState("");
  const [xToken, setXToken] = useState("");

  const [title, setTitle] = useState("Paste RedNote post link");
  const [description, setDescription] = useState("Please paste a valid RedNote post link");

  useEffect(() => {
    if (!searchText) {
      setTitle("Paste RedNote post link");
      return;
    }

    const [path, query] = searchText.split("?");
    const params = new URLSearchParams(query);
    const noteId = path.split("/").pop() || "";
    const xToken = params.get("xsec_token") || "";
    setNoteId(noteId);
    setXToken(xToken);

    if (!noteId || !xToken) {
      setTitle("Invalid link");
      setDescription("Please paste a valid RedNote post link");
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid link",
        message: "Please paste a valid RedNote post link",
      });
    } else {
      setTitle("Note ID: " + noteId);
      setDescription("Press Enter to preview detail");
      showToast({
        style: Toast.Style.Success,
        title: "Valid link",
        message: "Press Enter to preview detail",
      });
    }
  }, [searchText]);

  const previewDetail = async () => {
    if (!noteId || !xToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid link",
        message: "Please paste a valid RedNote post link",
      });
      return;
    }

    const details = await client.getNoteInfo(noteId, xToken);
    if (details) {
      push(<DetailInfo details={details} />);
    }
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Paste RedNote Post Link"
      searchBarPlaceholder="Paste RedNote post link"
    >
      <List.EmptyView
        title={title}
        description={description}
        icon={{ source: "red-note-icon.png" }}
        actions={
          <ActionPanel>
            <Action title="Preview Detail" onAction={previewDetail} />
            <Action title="Change Cookie" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

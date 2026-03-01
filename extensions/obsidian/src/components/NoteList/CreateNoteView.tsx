import { Action, ActionPanel, List, open } from "@raycast/api";
import { Obsidian, ObsidianTargetType, ObsidianVault } from "../../obsidian";

interface CreateNoteViewProps {
  title: string;
  vault: ObsidianVault;
  searchText: string;
  onSearchChange: (text: string) => void;
}

/** This is shown when a search for notes returns zero notes. It let's the user directly create a new note with the current search term */
export function CreateNoteView(props: CreateNoteViewProps) {
  function onNoteCreation() {
    const target = Obsidian.getTarget({ type: ObsidianTargetType.NewNote, vault: props.vault, name: props.searchText });
    open(target);
    //TODO: maybe dispatch here. But what if the user cancels the creation in Obsidian or renames it there? Then the cache would be out of sync.
  }

  return (
    <List
      navigationTitle={props.title}
      onSearchTextChange={(value) => {
        props.onSearchChange(value);
      }}
    >
      <List.Item
        title={`🗒️ Create Note "${props.searchText}"`}
        actions={
          <ActionPanel>
            <Action title="Create Note" onAction={onNoteCreation} />
          </ActionPanel>
        }
      />
    </List>
  );
}

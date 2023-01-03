import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";

type Props = {
  onSelect: (title: string) => void;
  onDelete: (title: string) => void;
  listItems: Record<string, string>;
};
export default function CardList({ onDelete, onSelect, listItems }: Props) {
  const [searchText, setSearchText] = useState("");

  const [filteredList, filterList] = useState(Object.keys(listItems));

  useEffect(() => {
    filterList(Object.keys(listItems).filter((item) => item.includes(searchText)));
  }, [searchText]);

  return (
    <List
      isShowingDetail={Object.keys(listItems).length > 0}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="NoteCards"
      searchBarPlaceholder="Search for a note card"
      actions={
        <ActionPanel>
          <Action
            title="Create new note"
            onAction={() => {
              onSelect(searchText);
            }}
          />
        </ActionPanel>
      }
    >
      {filteredList.map((item) => (
        <List.Item
          key={item}
          title={item}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => onSelect(item)} />
              <Action title="Delete card" onAction={() => onDelete(item)} />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={listItems[item]} />}
        />
      ))}
    </List>
  );
}

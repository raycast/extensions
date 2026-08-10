import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { getAllCanvases, CanvasEntry, removeCanvas } from "./utils/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [uiItems, setUiItems] = useState<CanvasEntry[]>([]);
  const [filteredList, filterList] = useState(uiItems);
  const [remove, setRemove] = useState(false);

  useEffect(() => {
    filterList(uiItems.filter((item) => item.title.includes(searchText)));
  }, [searchText]);

  useEffect(() => {
    async function setCanvases() {
      const canvases = await getAllCanvases();
      setUiItems(canvases);
      filterList(canvases);
    }
    setCanvases();
  }, [remove]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Remove Canvas"
      searchBarPlaceholder="Remove a canvas"
    >
      {filteredList.map((item: CanvasEntry) => (
        <List.Item
          key={item.title}
          title={item.title}
          actions={
            <ActionPanel>
              <Action
                title="Remove Canvas"
                onAction={() => {
                  removeCanvas(item.title);
                  setRemove(!remove);
                }}
              />{" "}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

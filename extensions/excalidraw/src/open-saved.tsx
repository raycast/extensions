import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { getAllCanvases, CanvasEntry } from "./utils/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [uiItems, setUiItems] = useState<CanvasEntry[]>([]);
  const [filteredList, filterList] = useState(uiItems);

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
  }, []);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Canvases"
      searchBarPlaceholder="Search for a canvas"
      isShowingDetail
    >
      {filteredList.map((item: CanvasEntry) => (
        <List.Item
          key={item.title}
          title={item.title}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title={"Title"} text={item.title} />
                  <List.Item.Detail.Metadata.Label title={"Date Imported"} text={item.dateCreated} />
                  <List.Item.Detail.Metadata.Label title={"URL"} text={item.url} />

                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Description"
                    text={item.description != "" ? item.description : "N/A"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

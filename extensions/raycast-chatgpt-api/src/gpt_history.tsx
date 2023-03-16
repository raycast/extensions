import { List, Cache, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatTime, clearHistoryItem } from "./lib/utils";

const cache = new Cache();

/**
 * @param args
 * @returns
 */
export default function Command() {
  const ls = cache.get("history");
  const list = ls ? JSON.parse(ls) : [];
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilterList] = useState(list);

  useEffect(() => {
    setFilterList(list.filter((item: any) => item.question.includes(searchText)));
  }, [searchText]);

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your chatGPT history"
      isShowingDetail
    >
      {filteredList.map((item: any) => (
        <List.Item
          key={item.created}
          title={`${item.question}`}
          subtitle={formatTime(item.created)}
          detail={<List.Item.Detail markdown={item.answer} />}
          actions={
            <ActionPanel title="Action">
              <Action.CopyToClipboard title="Copy Content" content={item.answer} />
              <Action
                icon={Icon.DeleteDocument}
                title="Delete Item"
                style={Action.Style.Destructive}
                onAction={() => {
                  clearHistoryItem(item.created);
                  const ls = cache.get("history");
                  const list = ls ? JSON.parse(ls) : [];
                  setFilterList(list);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

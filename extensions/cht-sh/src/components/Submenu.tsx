import { getCheatsheetList } from "../utils/api";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import SearchDetail from "./SearchDetail";
import { useEffect, useState } from "react";
import searchStringArray from "../utils/search";

interface SubmenuProps {
  url: string;
}

export default function Submenu(props: SubmenuProps) {
  const { isLoading, data } = getCheatsheetList(`/${props.url}`);

  const [searchText, setSearchText] = useState("");
  const [filteredData, setFilteredData] = useState<string[]>(data);

  useEffect(() => {
    if (!searchText) {
      setFilteredData(data);
      return;
    }
    setFilteredData(searchStringArray(data, searchText));
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder={`Filter ${props.url} cheatsheets by name or search for a keyword`}
      onSearchTextChange={setSearchText}
      navigationTitle={"Cheatsheets"}
    >
      {searchText && props.url !== "/" && (
        <List.Item
          title={`Search for "${searchText}" in "${props.url}" cheatsheets`}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Search Cheatsheets"}
                target={<SearchDetail language={props.url} url={`/${props.url}`} search={searchText} count={0} />}
              />
            </ActionPanel>
          }
        />
      )}
      {filteredData.slice(0, 3000).map((cheatsheet, index) => (
        <List.Item
          key={index}
          title={cheatsheet}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Code} title={"Open Cheatsheet"} target={<Submenu url={cheatsheet} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

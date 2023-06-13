import { getCheatsheetList } from "../utils/api";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import SearchDetail from "./SearchDetail";
import { useEffect, useState } from "react";
import searchStringArray from "../utils/search";

interface SubmenuProps {
  url: string;
}

export default function Submenu(props: SubmenuProps) {
  const [data, setData] = useState<string[]>();
  const [searchText, setSearchText] = useState("");
  const [filteredData, setFilteredData] = useState<string[]>();

  useEffect(() => {
    getCheatsheetList(`/${props.url}`).then((data) => {
      setData(data);
    });
  }, [props.url]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (!searchText) {
      setFilteredData(data);
      return;
    }
    setFilteredData(searchStringArray(data, searchText));
  }, [searchText, data]);

  const navigationTitle = props.url === "/" ? "Cheatsheets" : `Cheatsheets: ${props.url}`;

  return (
    <List
      isLoading={filteredData === undefined}
      filtering={false}
      searchBarPlaceholder={`Go to more detailed cheatsheets in ${props.url} or directly search for a keyword`}
      onSearchTextChange={setSearchText}
      navigationTitle={navigationTitle}
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
      {filteredData?.slice(0, 3000).map((cheatsheet, index) => (
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
      {filteredData?.length === 0 && props.url !== "/" && (
        <List.EmptyView
          title={`No more detailed section in "${props.url} cheatsheets"`}
          description={`Directly search a keyword to search in "${props.url}" cheatsheets. For example, try to type "quick sort" in the navigation bar.`}
        />
      )}
    </List>
  );
}

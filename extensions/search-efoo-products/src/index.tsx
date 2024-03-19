import { useEffect, useState } from "react";
import { ActionPanel, Detail, List, Action } from "@raycast/api";
import axios from "axios";

const DEPLOY_KEY = "AKfycbyjWnwi2m9-_O-6jD9f-mZzn6ouFw-37X8bSHG6MMXtPqmEswhrKauG7xJEfPcs2OBR";
const API_KEY = "rDz81L1wqjYVYzF5MmpdI8jSY5j8fp93";

export default function Command() {
  const [searchText, setSearchText] = useState("1000");
  const [filteredList, setFilterList] = useState([]);

  useEffect(() => {
    // 非同期処理でデータを取得する

    console.log("searchText", searchText);
    const main = async () => {
      if (searchText === null || searchText === "") {
        return;
      }

      const response = await axios.get(
        `https://script.google.com/macros/s/${DEPLOY_KEY}/exec?api_key=${API_KEY}&id=${searchText}`,
      );
      const data = await response.data;
      console.log(data);
      setFilterList(data);
    };

    main();
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {filteredList.map((item: any) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel title={`${item.id}: ${item.title}`}>
              <Action.OpenInBrowser url={item.url} />
              {/* <Action.CopyToClipboard title="Copy Pull Request Number" content="#1" /> */}
              {/* <Action title="Close Pull Request" onAction={() => console.log("Close PR #1")} /> */}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

import {  List,ActionPanel,Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { ConvertTime } from "./convert";
import { TimeItem } from "./types";


export function ShowTime() {
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<TimeItem[]>([]);

  useEffect(() => {
    const newResult =  ConvertTime(searchText);
    setResult(newResult);

  }, [searchText]);


  return (
    <List
      searchBarPlaceholder="convert timestamp"
      onSearchTextChange={ (searchText) => setSearchText(searchText)}
      isLoading={result.length === 0 || result.length === undefined}
    >
      {result.map((item) => (
        <List.Item
          key={item.id}
          title={item.val}
          icon={ item.icon}
          actions={
            <ActionPanel title="Copy to Clipboard">
              <Action.CopyToClipboard title="Copy to Clipboard" content={item.val} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}


export default  function Command() {

  return (
   <>
     { <ShowTime />}

   </>
  );
}
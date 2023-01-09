import { Action, ActionPanel, List, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useRef } from "react";
import costflow from "costflow";


export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data } = usePromise(
    async (text: string) => {
      const result = await costflow.parse(text, {
        mode: "beancount",
        currency: "USD",
        timezone: "America/Los_Angeles",
        account: {
          visa: "Liabilities:Visa",
          music: "Expenses:Music",
        },
        formula: {
          spotify: "@Spotify #music 15.98 USD visa > music",
        },
      });
      return result
    },
    [searchText],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search npm packages..."
      throttle
      isShowingDetail
    >

      {searchText === "" ? (
        <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />)
        : (
          <List.Item
            icon={Icon.Star}
            title={searchText}
            accessories={[{ text: "Germany" }]}
            detail={
              <List.Item.Detail markdown={(data as any)?.output}/>
            }
            /* actions={ */
            /*   <ActionPanel> */
            /*     <Action.Push title="Show Details" target={<Detail markdown={(data as any)?.output} />} /> */
            /*   </ActionPanel> */
            /* } */
          />)}
    </List>
  );
}

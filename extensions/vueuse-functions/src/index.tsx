import { ActionPanel, List, Action } from "@raycast/api";
import { useState } from "react";
import { useFunctions } from "./useFunctions";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { data, isLoading } = useFunctions(searchText);
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText}>
      {data.map((func) => (
        <List.Item
          key={func.title}
          icon="vue-use.png"
          title={func.title}
          subtitle={func.subTitle}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={func.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { searchSprints } from "./lib/api";
import { Sprint } from "./lib/type";
import { useState } from "react";
import { convertSprintURL, convertTimestamp } from "./lib/util";

export function SearchSprints() {
  const [searchResult, setSearchResult] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const search = async (text: string) => {
    text = text.trim();
    if (text.length === 0) {
      return;
    }
    setLoading(true);
    try {
      const result = await searchSprints(text);
      result.map((sprint) => {
        sprint.url = convertSprintURL(sprint.project.uuid, sprint.uuid);
        return sprint;
      });
      setSearchResult(result);
      setSearchText(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <List isLoading={loading} onSearchTextChange={search} searchText={searchText} throttle>
      {searchResult.map((item: Sprint, index: number) => (
        <List.Item
          key={index}
          title={item.name}
          subtitle={item.assign.name}
          accessories={[
            {
              text: `${item.planStartTime ? convertTimestamp(item.planStartTime) : "?"} - ${
                item.planEndTime ? convertTimestamp(item.planEndTime) : "?"
              }`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url ?? ""} />
              <Action.CopyToClipboard title="Copy URL" content={item.url ?? ""} />
              <Action.SubmitForm
                title="Refresh"
                onSubmit={async () => {
                  await search(searchText);
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <SearchSprints />;
}

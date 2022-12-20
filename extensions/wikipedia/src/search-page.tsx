import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import ShowDetailsPage from "./show-details-page";
import { encodeTitle, useWikipediaPageData, useWikipediaSearch } from "./wikipedia";

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const { data: titles, isValidating } = useWikipediaSearch(search);

  return (
    <List
      throttle
      isLoading={isValidating}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search pages by name..."
    >
      {titles?.map((title) => (
        <PageItem key={title} title={title} />
      ))}
    </List>
  );
}

function PageItem({ title }: { title: string }) {
  const { data } = useWikipediaPageData(title);

  return (
    <List.Item
      icon={{ source: data?.thumbnail?.source ? data?.thumbnail?.source : "../assets/wikipedia.png" }}
      id={title}
      key={title}
      title={title}
      subtitle={data?.description}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://wikipedia.org/wiki/${encodeTitle(title)}`} />
          <Action.Push
            icon={Icon.Window}
            title={"Show Details"}
            target={<ShowDetailsPage title={title} extract={data?.extract} description={data?.description} />}
          />
          <Action.CopyToClipboard
            shortcut={{ modifiers: ["cmd"], key: "." }}
            title="Copy URL"
            content={`https://wikipedia.org/wiki/${encodeTitle(title)}`}
          />
        </ActionPanel>
      }
    />
  );
}

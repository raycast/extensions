import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useState } from "react";
import { encodeTitle, useWikipediaPageData, useWikipediaSearch } from "./wikipedia";
import ShowDetailsPage from "./show-details-page";

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
          <OpenInBrowserAction url={`https://wikipedia.org/wiki/${encodeTitle(title)}`} />
          <PushAction
            icon={Icon.Window}
            title={"Show Details"}
            target={<ShowDetailsPage title={title} extract={data?.extract} description={data?.description} />}
          />
          <CopyToClipboardAction
            shortcut={{ modifiers: ["cmd"], key: "." }}
            title="Copy URL"
            content={`https://wikipedia.org/wiki/${encodeTitle(title)}`}
          />
        </ActionPanel>
      }
    />
  );
}

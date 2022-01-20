import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction } from "@raycast/api";
import { useState } from "react";
import { useWikipediaPageSummary, useWikipediaSearch } from "./wikipedia";

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
  const { data: extract } = useWikipediaPageSummary(title);
  return (
    <List.Item
      icon={Icon.TextDocument}
      id={title}
      key={title}
      title={title}
      subtitle={extract}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://wikipedia.org/wiki/${title}`} />
          <CopyToClipboardAction
            title="Copy URL"
            shortcut={{ modifiers: ["cmd"], key: "." }}
            content={`https://wikipedia.org/wiki/${title}`}
          />
        </ActionPanel>
      }
    />
  );
}

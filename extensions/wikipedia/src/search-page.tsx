import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import ShowDetailsPage from "./show-details-page";
import { findPagesByTitle, getPageData } from "./wikipedia";

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const { data: titles, isLoading } = usePromise(findPagesByTitle, [search]);

  return (
    <List throttle isLoading={isLoading} onSearchTextChange={setSearch} searchBarPlaceholder="Search pages by name...">
      {titles?.map((title) => (
        <PageItem key={title} title={title} />
      ))}
    </List>
  );
}

function PageItem({ title }: { title: string }) {
  const { data: page } = usePromise(getPageData, [title]);

  return (
    <List.Item
      icon={{ source: page?.thumbnail?.source || "../assets/wikipedia.png" }}
      id={title}
      title={title}
      subtitle={page?.description}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page?.content_urls.desktop.page || ""} />
          {page && <Action.Push icon={Icon.Window} title={"Show Details"} target={<ShowDetailsPage page={page} />} />}
          <Action.CopyToClipboard
            shortcut={{ modifiers: ["cmd"], key: "." }}
            title="Copy URL"
            content={page?.content_urls.desktop.page || ""}
          />
        </ActionPanel>
      }
    />
  );
}

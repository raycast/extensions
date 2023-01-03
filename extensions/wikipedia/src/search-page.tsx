import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import ShowDetailsPage from "./show-details-page";
import { findPagesByTitle, getPageData } from "./wikipedia";

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("en");
  const { data, isLoading } = usePromise(findPagesByTitle, [search, language]);

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search pages by name..."
      searchBarAccessory={
        <List.Dropdown tooltip="Language" storeValue onChange={setLanguage}>
          <List.Dropdown.Item title="English" value="en" />
          <List.Dropdown.Item title="German" value="de" />
          <List.Dropdown.Item title="French" value="fr" />
          <List.Dropdown.Item title="Japanese" value="ja" />
          <List.Dropdown.Item title="Spanish" value="es" />
          <List.Dropdown.Item title="Russian" value="ru" />
        </List.Dropdown>
      }
    >
      {data?.language === language &&
        data?.results.map((title) => <PageItem key={title} title={title} language={language} />)}
    </List>
  );
}

function PageItem({ title, language }: { title: string; language: string }) {
  const { data: page } = usePromise(getPageData, [title, language]);

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

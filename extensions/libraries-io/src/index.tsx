import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { PackageVersions } from "./components/PackageVersions";
import { PackageDependencies } from "./components/PackageDependencies";
import type { Package } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch<Package[]>(`https://libraries.io/api/search?q=${searchText}`, {
    execute: searchText !== "",
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search packages on Libraries.io..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.name + searchResult.platform} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Package }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={`package_manager_icons/${searchResult.platform.toLowerCase()}.png`}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.platform}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser
              title="Open Libraries.io Page"
              url={`https://libraries.io/${searchResult.platform.toLowerCase()}/${encodeURIComponent(
                searchResult.name
              )}`}
              icon={`libraries-io-icon.png`}
            />
            <Action.OpenInBrowser title="Open Homepage" url={searchResult.homepage} icon={Icon.House} />
            <Action.OpenInBrowser
              title="Open Repository"
              url={searchResult.repository_url}
              icon={Icon.Book}
              shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
            />
            <Action.OpenInBrowser
              title="Open Package Manager Page"
              url={searchResult.package_manager_url}
              icon={`package_manager_icons/${searchResult.platform.toLowerCase()}.png`}
              shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            <Action.Push
              title="Show Versions"
              icon={Icon.Tag}
              target={<PackageVersions key={searchResult.name + searchResult.platform} searchResult={searchResult} />}
            />
            <Action.Push
              title="Show Dependencies"
              icon={Icon.Box}
              target={
                <PackageDependencies key={searchResult.name + searchResult.platform} searchResult={searchResult} />
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

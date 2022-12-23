import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { OpenInLittleArc, OpenInNewWindow, OpenInOtherBrowserAction } from "./actions";
import { getTopTabs, getSpaces, searchSpaces, searchSpace, searchFolder } from "./utils/sidebar";
import { SideBarSpace, SideBarFolder, SideBarTab, SideBarItem, SearchResult } from "./utils/types";
import { getDomain, match } from "./utils/utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [topTabs, setTopTabs] = useState<SideBarTab[]>([]);
  const [spaces, setSpaces] = useState<SideBarSpace[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | undefined>();

  useEffect(() => {
    (async () => {
      setTopTabs(await getTopTabs());
      setSpaces(await getSpaces());
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    setSearchResults(searchSpaces(spaces, searchText));
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search spaces, folders, or tabs"
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView title="Not Found" />
      <List.Section title="Top Tabs">
        {topTabs
          .filter((tab: SideBarTab) => match(tab.title, searchText) || match(tab.url, searchText))
          .map((tab: SideBarTab) => (
            <Tab key={tab.id} tab={tab} />
          ))}
      </List.Section>
      {searchResults === undefined ? (
        <List.Section title="Spaces">
          {spaces?.map((space: SideBarSpace) => (
            <List.Item
              key={space.id}
              icon={space.icon}
              title={space.title}
              actions={
                <ActionPanel>
                  <Action.Push title={`Open ${space.title}`} target={<Space space={space} />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <SearchResults results={searchResults} />
      )}
    </List>
  );
}

export const Item = ({ item }: { item: SideBarItem }) => {
  if ("children" in item) {
    return <Folder folder={item} />;
  } else if ("url" in item) {
    return <Tab tab={item} />;
  } else if ("tabs" in item) {
    return (
      <List.Item
        title={item.tabs.map((tab: SideBarTab) => tab.title).join("  ⎪  ")}
        icon={{ source: "../assets/split-view.svg", tintColor: item.color }}
      />
    );
  } else {
    return (
      <List.Item
        title={item.title}
        icon={{ source: item.type === "notes" ? Icon.Document : Icon.Highlight, tintColor: item.color }}
      />
    );
  }
};

const SearchResults = ({ results }: { results: SearchResult[] }) => {
  return (
    <React.Fragment>
      {results.map((result: SearchResult) => {
        return (
          <List.Section key={result.parent.id} title={result.parent.title}>
            {result.children.map((item: SideBarItem) => (
              <Item key={item.id} item={item} />
            ))}
          </List.Section>
        );
      })}
    </React.Fragment>
  );
};

const Space = ({ space }: { space: SideBarSpace }) => {
  const [searchResults, setSearchResults] = useState<SearchResult[] | undefined>();
  return (
    <List
      isLoading={false}
      navigationTitle={space.title}
      searchBarPlaceholder="Search folders or tabs"
      onSearchTextChange={(text: string) => setSearchResults(searchSpace(space, text))}
    >
      {searchResults === undefined ? (
        <React.Fragment>
          <List.Section title="Pinned">
            {space.pinned.map((item: SideBarItem) => (
              <Item key={item.id} item={item} />
            ))}
          </List.Section>
          <List.Section title="Open">
            {space.unpinned.map((item: SideBarTab) => (
              <Item key={item.id} item={item} />
            ))}
          </List.Section>
        </React.Fragment>
      ) : (
        <SearchResults results={searchResults} />
      )}
    </List>
  );
};

const Tab = ({ tab }: { tab: SideBarTab }) => {
  return (
    <List.Item
      icon={tab.icon}
      title={tab.title}
      subtitle={getDomain(tab.url)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={tab.url} />
            <OpenInLittleArc url={tab.url} />
            <OpenInNewWindow url={tab.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenInOtherBrowserAction url={tab.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Page URL"
              content={tab.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Page Title"
              content={tab.title}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy URL as Markdown"
              content={`[${tab.title}](${tab.url})`}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const Folder = ({ folder }: { folder: SideBarFolder }) => {
  const [searchResults, setSearchResults] = useState<SearchResult[] | undefined>();
  return (
    <List.Item
      title={folder.title}
      icon={{ source: Icon.Folder, tintColor: folder.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Folder"
            target={
              <List
                isLoading={false}
                navigationTitle={folder.title}
                searchBarPlaceholder="Search folders or tabs"
                onSearchTextChange={(text: string) => setSearchResults(searchFolder(folder, text))}
              >
                {searchResults === undefined ? (
                  folder.children.map((item: SideBarItem) => <Item key={item.id} item={item} />)
                ) : (
                  <SearchResults results={searchResults} />
                )}
              </List>
            }
          />
        </ActionPanel>
      }
    ></List.Item>
  );
};

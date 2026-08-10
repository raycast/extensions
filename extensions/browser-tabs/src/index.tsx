import { List, Icon, ActionPanel, Image, Action, open } from "@raycast/api";
import { useBrowserTabs } from "./hooks/useBrowserTabs";
import { getFavicon } from "@raycast/utils";
import { useMemo, useState } from "react";
import { useFrontmostApp } from "./hooks/useFrontmostApp";
import Fuse from "fuse.js";
import { BrowserTab } from "./types/types";
import { ActionSettings } from "./components/action-settings";
import { ActionTab } from "./components/action-tab";
import { useDefaultBrowser } from "./hooks/useDefaultBrowser";
import { rememberFilterTag, showDomain } from "./types/preferences";
import { searchUrlBuilder } from "./utils/common-utils";
import { SetupBrowsers } from "./setup-browsers";
import { useBrowserSetup } from "./hooks/useBrowserSetup";

export default function Command() {
  const [query, setQuery] = useState("");
  const [selectedBrowser, setSelectedBrowser] = useState("");
  const { data: frontmostApp, mutate: frontmostMutate } = useFrontmostApp();
  const { data: defaultBrowser } = useDefaultBrowser();

  const [searchBrowser, setSearchBrowser] = useState(defaultBrowser);
  const { data: browserTabs, isLoading, mutate } = useBrowserTabs();

  const { data: browserSetupData } = useBrowserSetup();

  const browserSetup = useMemo(() => {
    if (!browserSetupData) return [];
    return browserSetupData;
  }, [browserSetupData]);

  const filterBrowserTabs = useMemo(() => {
    if (selectedBrowser === "") {
      setSearchBrowser(defaultBrowser);
    } else {
      setSearchBrowser(browserTabs?.find((item) => item.browser.name === selectedBrowser)?.browser);
    }
    const filteredTabs = browserTabs?.filter((item) => {
      if (selectedBrowser === "") {
        return true;
      }
      return item.browser.name === selectedBrowser;
    });
    if (frontmostApp && filteredTabs && filteredTabs.length > 1) {
      const index = filteredTabs.findIndex((item) => item.browser.name === frontmostApp.name);
      if (index > 0) {
        const [frontmostBrowser] = filteredTabs.splice(index, 1);
        filteredTabs.unshift(frontmostBrowser);
      }
    }

    return filteredTabs ?? [];
  }, [browserTabs, selectedBrowser, frontmostApp]);

  const fuse = useMemo(() => {
    const browserTabs: BrowserTab[] = [];
    // fuse tab
    for (const item of filterBrowserTabs) {
      const fuse_ = new Fuse(item.tabs, {
        keys: [
          { name: "title", weight: 3 },
          { name: "domain", weight: 1 },
          { name: "browser", weight: 0.5 },
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
      });
      const browserTab = { browser: item.browser, tabs: fuse_.search(query).map((result) => result.item) };
      browserTabs.push(browserTab);
    }
    return browserTabs;
  }, [filterBrowserTabs, query]);

  const searchFilterTabs = useMemo(() => {
    if (query === "") {
      return filterBrowserTabs;
    }
    return fuse;
  }, [filterBrowserTabs, fuse, query]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs"
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarAccessory={
        <List.Dropdown storeValue={rememberFilterTag} tooltip="Browser" onChange={setSelectedBrowser}>
          <List.Dropdown.Item icon={Icon.Compass} title="All" value="" />
          {browserTabs?.map((item) => (
            <List.Dropdown.Item
              key={item.browser.path}
              icon={{ fileIcon: item.browser.path }}
              title={item.browser.name}
              value={item.browser.name}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={"empty-icon.png"}
        title="You don't have any open tabs"
        description={searchBrowser ? `Press ⏎ to search ${query} in ${searchBrowser.name}` : undefined}
        actions={
          <ActionPanel>
            {searchBrowser && (
              <Action
                icon={{ fileIcon: searchBrowser.path }}
                title={`Search in ${searchBrowser.name}`}
                onAction={async () => {
                  await open(searchUrlBuilder(query), searchBrowser);
                  setQuery("");
                  await mutate();
                }}
              />
            )}
            <Action
              icon={Icon.Repeat}
              title={`Fetch Tabs`}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await frontmostMutate();
                await mutate();
              }}
            />
            <ActionPanel.Section>
              <Action.Push
                title={"Setup Browser"}
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
                target={<SetupBrowsers browserTabsMutate={mutate} />}
              />
            </ActionPanel.Section>
            <ActionSettings />
          </ActionPanel>
        }
      />
      {searchFilterTabs?.map((browserItem) => {
        return browserItem.tabs.slice(0, 100).map((tabItem, index) => (
          <List.Item
            key={tabItem.title + index}
            title={tabItem.title}
            subtitle={showDomain ? { value: tabItem.domain, tooltip: tabItem.url } : undefined}
            accessories={[{ tag: browserItem.browser.name, icon: { fileIcon: browserItem.browser.path } }]}
            icon={getFavicon(tabItem.url, { fallback: Icon.Link, mask: Image.Mask.RoundedRectangle })}
            actions={
              <ActionPanel>
                <ActionTab
                  defaultBrowser={defaultBrowser}
                  browser={browserItem.browser}
                  tab={tabItem}
                  mutate={mutate}
                  frontmostMutate={frontmostMutate}
                  browserSetup={browserSetup}
                />
                <ActionSettings />
              </ActionPanel>
            }
          />
        ));
      })}
    </List>
  );
}

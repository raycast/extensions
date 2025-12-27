import { Action, ActionPanel, closeMainWindow, Icon, List, popToRoot } from "@raycast/api";
import { existsSync, readdirSync } from "fs";
import { JSX, useEffect, useState } from "react";

import { CACHE_DIR } from "./utils/constants";
import { refreshPages } from "./utils/download";
import { readPages, Platform, Page } from "./utils/pages";

export default function TLDRList(): JSX.Element {
  const [platforms, setPlatforms] = useState<Record<string, Platform>>();
  const [selectedPlatformName, setSelectedPlatformName] = useState<string>("osx");

  const selectedPlatforms = platforms ? [platforms[selectedPlatformName], platforms["common"]] : undefined;

  async function loadPages(options?: { forceRefresh?: boolean }) {
    try {
      if (!existsSync(CACHE_DIR) || readdirSync(CACHE_DIR).length === 0 || options?.forceRefresh) {
        await refreshPages();
      }
      const platforms = await readPages();
      setPlatforms(Object.fromEntries(platforms.map((platform) => [platform.name, platform])));
    } catch (error) {
      console.error("Failed to load pages:", error);
    }
  }

  useEffect(() => {
    loadPages();
  }, []);

  return (
    <List
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Platform" storeValue onChange={setSelectedPlatformName}>
          <List.Dropdown.Section>
            {["osx", "linux", "windows", "sunos", "android"].map((platform) => (
              <List.Dropdown.Item title={platform} value={platform} key={platform} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isLoading={!platforms}
    >
      {selectedPlatforms?.map((platform) => (
        <List.Section title={platform.name} key={platform.name}>
          {platform.pages
            .sort((a, b) => a.command.localeCompare(b.command))
            .map((page) => (
              <List.Item
                title={page.command}
                detail={<List.Item.Detail markdown={page.markdown} />}
                key={page.filename}
                actions={
                  <ActionPanel>
                    <Action.Push title="Browse Examples" icon={Icon.ArrowRight} target={<CommandList page={page} />} />
                    <OpenCommandWebsiteAction page={page} />
                    <Action
                      title="Refresh Pages"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={async () => {
                        await loadPages({ forceRefresh: true });
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function OpenCommandWebsiteAction(props: { page: Page }) {
  const page = props.page;
  return page.url ? <Action.OpenInBrowser title="Open Command Website" url={page.url} /> : null;
}

function CommandList(props: { page: Page }) {
  const page = props.page;
  return (
    <List navigationTitle={page.command}>
      {page.items?.map((item) => (
        <List.Section key={item.description} title={item.description}>
          <List.Item
            title={item.command}
            key={item.command}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={item.command}
                  onCopy={async () => {
                    await closeMainWindow();
                    await popToRoot();
                  }}
                />
                <OpenCommandWebsiteAction page={page} />
              </ActionPanel>
            }
          />
        </List.Section>
      ))}
    </List>
  );
}

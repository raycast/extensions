import { Action, ActionPanel, Icon, Keyboard, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise, useCachedState } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";

import PermissionErrorScreen from "./components/PermissionErrorScreen";
import SelectBrowsers from "./components/SelectBrowsers";
import useAvailableBrowsers, { BROWSERS_BUNDLE_ID } from "./hooks/useAvailableBrowsers";
import useBraveBookmarks from "./hooks/useBraveBookmarks";
import useChromeBookmarks from "./hooks/useChromeBookmarks";
import useEdgeBookmarks from "./hooks/useEdgeBookmarks";
import useFirefoxBookmarks from "./hooks/useFirefoxBookmarks";
import useSafariBookmarks from "./hooks/useSafariBookmarks";
import { getMacOSDefaultBrowser } from "./utils/browsers";
import { BookmarkFrecency, getBookmarkFrecency } from "./utils/frecency";

type Bookmark = {
  id: string;
  browser: string;
  title: string;
  url: string;
  folder: string;
  domain: string;
  bookmarkFrecency?: BookmarkFrecency;
};

type Folder = {
  id: string;
  icon: string;
  browser: string;
  title: string;
};

export default function Command() {
  const { data: availableBrowsers } = useAvailableBrowsers();

  const {
    data: storedBrowsers,
    isLoading: isLoadingBrowsers,
    mutate: mutateBrowsers,
  } = useCachedPromise(
    async (browsers) => {
      // If the user only has one browser, let's not bother with LocalStorage stuff
      if (browsers && browsers.length === 1) {
        return [browsers[0].bundleId as string];
      }

      const defaultBrowser = await getMacOSDefaultBrowser();
      const browsersItem = await LocalStorage.getItem("browsers");

      return browsersItem ? (JSON.parse(browsersItem.toString()) as string[]) : [defaultBrowser];
    },
    [availableBrowsers]
  );

  async function setBrowsers(browsers: string[]) {
    await LocalStorage.setItem("browsers", JSON.stringify(browsers));
    mutateBrowsers();
  }

  const {
    data: storedFrecencies,
    isLoading: isLoadingFrecencies,
    mutate: mutateFrecencies,
  } = useCachedPromise(async () => {
    const frecenciesItem = await LocalStorage.getItem("frecencies");

    return frecenciesItem
      ? (JSON.parse(frecenciesItem.toString()) as Record<string, BookmarkFrecency | undefined>)
      : {};
  });

  const browsers = useMemo(() => storedBrowsers ?? [], [storedBrowsers]);
  const frecencies = useMemo(() => storedFrecencies ?? {}, [storedFrecencies]);

  const [query, setQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const hasBrave = browsers.includes(BROWSERS_BUNDLE_ID.brave) ?? false;
  const hasChrome = browsers.includes(BROWSERS_BUNDLE_ID.chrome) ?? false;
  const hasEdge = browsers.includes(BROWSERS_BUNDLE_ID.edge) ?? false;
  const hasFirefox = browsers.includes(BROWSERS_BUNDLE_ID.firefox) ?? false;
  const hasSafari = browsers.includes(BROWSERS_BUNDLE_ID.safari) ?? false;

  const brave = useBraveBookmarks(hasBrave);
  const chrome = useChromeBookmarks(hasChrome);
  const edge = useEdgeBookmarks(hasEdge);
  const firefox = useFirefoxBookmarks(hasFirefox);
  const safari = useSafariBookmarks(hasSafari);

  const [bookmarks, setBookmarks] = useCachedState<Bookmark[]>("bookmarks", []);
  const [folders, setFolders] = useCachedState<Folder[]>("folders", []);

  useEffect(() => {
    const bookmarks = [
      ...brave.bookmarks,
      ...chrome.bookmarks,
      ...edge.bookmarks,
      ...firefox.bookmarks,
      ...safari.bookmarks,
    ]
      .map((item) => {
        let domain;
        try {
          domain = new URL(item.url).hostname;
        } catch (error) {
          console.error(`Invalid URL: ${item.url}`);
          domain = "";
        }

        return { ...item, domain, bookmarkFrecency: frecencies[item.id] };
      })
      .sort((a, b) => {
        // If a has a frecency, but b doesn't, a should come first
        if (a.bookmarkFrecency && !b.bookmarkFrecency) {
          return -1;
        }

        // If b has a frecency, but a doesn't, b should come first
        if (!a.bookmarkFrecency && b.bookmarkFrecency) {
          return 1;
        }

        // If both frecencies are defined,put the one with the higher frecency first
        if (a.bookmarkFrecency && b.bookmarkFrecency) {
          return b.bookmarkFrecency.frecency - a.bookmarkFrecency.frecency;
        }

        // If both frecencies are undefined, sort by title
        return a.title.localeCompare(b.title);
      });

    setBookmarks(bookmarks);
  }, [
    brave.bookmarks,
    chrome.bookmarks,
    edge.bookmarks,
    firefox.bookmarks,
    safari.bookmarks,
    frecencies,
    setBookmarks,
  ]);

  useEffect(() => {
    const folders = [...brave.folders, ...chrome.folders, ...edge.folders, ...firefox.folders, ...safari.folders];

    setFolders(folders);
  }, [brave.folders, chrome.folders, edge.folders, firefox.folders, safari.folders, setFolders]);

  const folderBookmarks = useMemo(() => {
    return bookmarks.filter((item) => {
      if (selectedFolderId === "") {
        return true;
      }

      const folder = folders.find((folder) => folder.id === selectedFolderId);

      if (!folder) {
        return true;
      }

      return item.browser === folder.browser && item.folder.includes(folder.title);
    });
  }, [bookmarks, selectedFolderId, folders]);

  // Limit display to 100 bookmarks to avoid heap memory errors
  // Use custom filtering instead of native filtering
  const filteredBookmarks = useMemo(() => {
    return folderBookmarks.filter((item) => {
      if (query === "") {
        return true;
      }

      // Check if the query matches the item's title, domain, or folder (case-insensitive)
      const lowercasedQuery = query.toLowerCase();

      return (
        item.title.toLowerCase().includes(lowercasedQuery) ||
        item.domain.toLowerCase().includes(lowercasedQuery) ||
        item.folder.toLowerCase().includes(lowercasedQuery)
      );
    });
  }, [folderBookmarks, query]);

  const filteredFolders = useMemo(() => {
    return folders.filter((item) => {
      if (!item.title) {
        return false;
      }

      return bookmarks.some((bookmark) => bookmark.browser === item.browser && bookmark.folder.includes(item.title));
    });
  }, [folders, bookmarks]);

  function mutateBookmarks() {
    if (hasBrave) {
      brave.mutate();
    }

    if (hasChrome) {
      chrome.mutate();
    }

    if (hasEdge) {
      edge.mutate();
    }

    if (hasFirefox) {
      firefox.mutate();
    }

    if (hasSafari) {
      safari.mutate();
    }
  }

  async function updateFrecency(item: { id: string; title: string; url: string; folder: string }) {
    if (frecencies) {
      const frecency = frecencies[item.id];

      await LocalStorage.setItem(
        "frecencies",
        JSON.stringify({
          ...frecencies,
          [item.id]: getBookmarkFrecency(frecency),
        })
      );

      mutateFrecencies();
    }
  }

  async function removeFrecency(item: { id: string; title: string; url: string; folder: string }) {
    try {
      if (frecencies) {
        delete frecencies[item.id];
        await LocalStorage.setItem("frecencies", JSON.stringify(frecencies));
        await showToast({ style: Toast.Style.Success, title: "Reset bookmark's ranking" });
        mutateFrecencies();
      }
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not reset bookmark's ranking" });
    }
  }

  if (safari.error?.message.includes("operation not permitted")) {
    return <PermissionErrorScreen />;
  }

  return (
    <List
      isLoading={
        isLoadingBrowsers ||
        isLoadingFrecencies ||
        brave.isLoading ||
        chrome.isLoading ||
        edge.isLoading ||
        firefox.isLoading ||
        safari.isLoading
      }
      searchBarPlaceholder="Search by title, domain name or tag in selected folder"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Folder" onChange={setSelectedFolderId}>
          <List.Dropdown.Item icon={Icon.Globe} title="All" value="" />

          {filteredFolders?.map((folder) => {
            const folderParts = folder.title.split("/");

            return (
              <List.Dropdown.Item
                key={folder.id}
                icon={folder.icon}
                title={folderParts[folderParts.length - 1]}
                value={folder.id}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {filteredBookmarks.slice(0, 100).map((item) => {
        return (
          <List.Item
            key={item.id}
            icon={getFavicon(item.url)}
            title={item.title}
            accessories={item.folder ? [{ icon: Icon.Folder, tag: item.folder }] : []}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} onOpen={() => updateFrecency(item)} />

                <Action.CopyToClipboard title="Copy Link" content={item.url} onCopy={() => updateFrecency(item)} />

                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => removeFrecency(item)} />

                <ActionPanel.Section>
                  {availableBrowsers && availableBrowsers.length > 1 ? (
                    <SelectBrowserAction browsers={browsers} setBrowsers={setBrowsers} />
                  ) : null}

                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.brave}
                    name="Brave"
                    icon="brave.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    profiles={brave.profiles}
                    currentProfile={brave.currentProfile}
                    setCurrentProfile={brave.setCurrentProfile}
                  />

                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.chrome}
                    name="Chrome"
                    icon="chrome.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    profiles={chrome.profiles}
                    currentProfile={chrome.currentProfile}
                    setCurrentProfile={chrome.setCurrentProfile}
                  />

                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.edge}
                    name="Edge"
                    icon="edge.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    profiles={edge.profiles}
                    currentProfile={edge.currentProfile}
                    setCurrentProfile={edge.setCurrentProfile}
                  />

                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.firefox}
                    name="Firefox"
                    icon="firefox.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    profiles={firefox.profiles}
                    currentProfile={firefox.currentProfile}
                    setCurrentProfile={firefox.setCurrentProfile}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={mutateBookmarks}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}

      <List.EmptyView
        title="You don't have any bookmarks"
        description="Press ⏎ to select the browsers you want to import bookmarks from."
        actions={
          <ActionPanel>
            <SelectBrowserAction browsers={browsers} setBrowsers={setBrowsers} />
          </ActionPanel>
        }
      />
    </List>
  );
}

type SelectBrowsersAction = {
  browsers: string[];
  setBrowsers: (browsers: string[]) => void;
  availableBrowsers?: string[];
};

function SelectBrowserAction({ browsers, setBrowsers }: SelectBrowsersAction) {
  return (
    <Action.Push
      title="Select Browsers"
      icon={Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      target={<SelectBrowsers browsers={browsers} onSelect={setBrowsers} />}
    />
  );
}

type SelectProfileSubmenuProps = {
  bundleId: string;
  name: string;
  icon: string;
  shortcut: Keyboard.Shortcut;
  profiles: { path: string; name: string }[];
  currentProfile: string;
  setCurrentProfile: (path: string) => void;
};

function SelectProfileSubmenu({
  bundleId,
  name,
  icon,
  shortcut,
  profiles,
  currentProfile,
  setCurrentProfile,
}: SelectProfileSubmenuProps) {
  const { data: availableBrowsers } = useAvailableBrowsers();

  const hasBrowser = availableBrowsers?.map((browser) => browser.bundleId).includes(bundleId);
  if (!hasBrowser || profiles.length <= 1) {
    return null;
  }

  return (
    <ActionPanel.Submenu title={`Select ${name} Profile`} icon={icon} shortcut={shortcut}>
      {profiles.map((profile) => {
        return (
          <Action
            autoFocus={profile.path === currentProfile}
            key={profile.name}
            title={profile.name}
            onAction={() => setCurrentProfile(profile.path)}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

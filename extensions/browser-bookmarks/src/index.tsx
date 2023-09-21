import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { getFavicon, useCachedPromise, useCachedState } from "@raycast/utils";
import Fuse from "fuse.js";
import { useState, useMemo, useEffect } from "react";

import PermissionErrorScreen from "./components/PermissionErrorScreen";
import SelectBrowsers from "./components/SelectBrowsers";
import useAvailableBrowsers, { BROWSERS_BUNDLE_ID } from "./hooks/useAvailableBrowsers";
import useBraveBetaBookmarks from "./hooks/useBraveBetaBookmarks";
import useBraveBookmarks from "./hooks/useBraveBookmarks";
import useChromeBookmarks from "./hooks/useChromeBookmarks";
import useChromeDevBookmarks from "./hooks/useChromeDevBookmarks";
import useEdgeBookmarks from "./hooks/useEdgeBookmarks";
import useEdgeCanaryBookmarks from "./hooks/useEdgeCanaryBookmarks";
import useEdgeDevBookmarks from "./hooks/useEdgeDevBookmarks";
import useFirefoxBookmarks from "./hooks/useFirefoxBookmarks";
import useSafariBookmarks from "./hooks/useSafariBookmarks";
import useVivaldiBookmarks from "./hooks/useVivaldiBrowser";
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

  const { showDomain } = getPreferenceValues<Preferences>();

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
  const hasBraveBeta = browsers.includes(BROWSERS_BUNDLE_ID.braveBeta) ?? false;
  const hasChrome = browsers.includes(BROWSERS_BUNDLE_ID.chrome) ?? false;
  const hasChromeDev = browsers.includes(BROWSERS_BUNDLE_ID.chromeDev) ?? false;
  const hasEdge = browsers.includes(BROWSERS_BUNDLE_ID.edge) ?? false;
  const hasEdgeCanary = browsers.includes(BROWSERS_BUNDLE_ID.edgeCanary) ?? false;
  const hasEdgeDev = browsers.includes(BROWSERS_BUNDLE_ID.edgeDev) ?? false;
  const hasFirefox = browsers.includes(BROWSERS_BUNDLE_ID.firefox) ?? false;
  const hasSafari = browsers.includes(BROWSERS_BUNDLE_ID.safari) ?? false;
  const hasVivaldi = browsers.includes(BROWSERS_BUNDLE_ID.vivaldi) ?? false;

  const brave = useBraveBookmarks(hasBrave);
  const braveBeta = useBraveBetaBookmarks(hasBraveBeta);
  const chrome = useChromeBookmarks(hasChrome);
  const chromeDev = useChromeDevBookmarks(hasChromeDev);
  const edge = useEdgeBookmarks(hasEdge);
  const edgeCanary = useEdgeCanaryBookmarks(hasEdgeCanary);
  const edgeDev = useEdgeDevBookmarks(hasEdgeDev);
  const firefox = useFirefoxBookmarks(hasFirefox);
  const safari = useSafariBookmarks(hasSafari);
  const vivaldi = useVivaldiBookmarks(hasVivaldi);

  const [bookmarks, setBookmarks] = useCachedState<Bookmark[]>("bookmarks", []);
  const [folders, setFolders] = useCachedState<Folder[]>("folders", []);

  useEffect(() => {
    const bookmarks = [
      ...brave.bookmarks,
      ...braveBeta.bookmarks,
      ...chrome.bookmarks,
      ...chromeDev.bookmarks,
      ...edge.bookmarks,
      ...edgeCanary.bookmarks,
      ...edgeDev.bookmarks,
      ...firefox.bookmarks,
      ...safari.bookmarks,
      ...vivaldi.bookmarks,
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
    braveBeta.bookmarks,
    chrome.bookmarks,
    chromeDev.bookmarks,
    edge.bookmarks,
    edgeCanary.bookmarks,
    edgeDev.bookmarks,
    firefox.bookmarks,
    safari.bookmarks,
    vivaldi.bookmarks,
    frecencies,
    setBookmarks,
  ]);

  useEffect(() => {
    const folders = [
      ...brave.folders,
      ...braveBeta.folders,
      ...chrome.folders,
      ...chromeDev.folders,
      ...edge.folders,
      ...edgeCanary.folders,
      ...edgeDev.folders,
      ...firefox.folders,
      ...safari.folders,
      ...vivaldi.folders,
    ];

    setFolders(folders);
  }, [
    brave.folders,
    braveBeta.folders,
    chrome.folders,
    chromeDev.folders,
    edge.folders,
    edgeCanary.folders,
    edgeDev.folders,
    firefox.folders,
    safari.folders,
    vivaldi.folders,
    setFolders,
  ]);

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

  const fuse = useMemo(() => {
    return new Fuse(folderBookmarks, {
      keys: [
        { name: "title", weight: 3 },
        { name: "domain", weight: 1 },
        { name: "folder", weight: 0.5 },
      ],
      threshold: 0.4,
    });
  }, [folderBookmarks]);

  // Limit display to 100 bookmarks to avoid heap memory errors
  // Use custom filtering instead of native filtering
  const filteredBookmarks = useMemo(() => {
    if (query === "") {
      return folderBookmarks;
    }

    const searchResults = fuse.search(query);

    return searchResults.map((result) => result.item);
  }, [folderBookmarks, fuse, query]);

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
    if (hasBraveBeta) {
      braveBeta.mutate();
    }
    if (hasChrome) {
      chrome.mutate();
    }
    if (hasChromeDev) {
      chromeDev.mutate();
    }
    if (hasEdge) {
      edge.mutate();
    }
    if (hasEdgeCanary) {
      edge.mutate();
    }
    if (hasEdgeDev) {
      edge.mutate();
    }
    if (hasFirefox) {
      firefox.mutate();
    }
    if (hasSafari) {
      safari.mutate();
    }
    if (hasVivaldi) {
      vivaldi.mutate();
    }
  }

  async function updateFrecency(item: { id: string; title: string; url: string; folder: string }) {
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

  async function removeFrecency(item: { id: string; title: string; url: string; folder: string }) {
    try {
      delete frecencies[item.id];
      await LocalStorage.setItem("frecencies", JSON.stringify(frecencies));
      await showToast({ style: Toast.Style.Success, title: "Reset bookmark's ranking" });
      mutateFrecencies();
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
        braveBeta.isLoading ||
        chrome.isLoading ||
        chromeDev.isLoading ||
        edge.isLoading ||
        edgeCanary.isLoading ||
        edgeDev.isLoading ||
        firefox.isLoading ||
        safari.isLoading ||
        vivaldi.isLoading
      }
      searchBarPlaceholder="Search by title, domain name, or folder name"
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
            subtitle={showDomain ? item.domain : ""}
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
                    bundleId={BROWSERS_BUNDLE_ID.braveBeta}
                    name="Brave Beta"
                    icon="brave.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    profiles={braveBeta.profiles}
                    currentProfile={braveBeta.currentProfile}
                    setCurrentProfile={braveBeta.setCurrentProfile}
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
                    bundleId={BROWSERS_BUNDLE_ID.chromeDev}
                    name="Chrome Dev"
                    icon="chrome-dev.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    profiles={chromeDev.profiles}
                    currentProfile={chromeDev.currentProfile}
                    setCurrentProfile={chromeDev.setCurrentProfile}
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
                    bundleId={BROWSERS_BUNDLE_ID.edgeCanary}
                    name="Edge Canary"
                    icon="edge.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    profiles={edgeCanary.profiles}
                    currentProfile={edgeCanary.currentProfile}
                    setCurrentProfile={edgeCanary.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.edgeDev}
                    name="Edge Dev"
                    icon="edge.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    profiles={edgeDev.profiles}
                    currentProfile={edgeDev.currentProfile}
                    setCurrentProfile={edgeDev.setCurrentProfile}
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
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.vivaldi}
                    name="Vivaldi"
                    icon="vivaldi.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    profiles={vivaldi.profiles}
                    currentProfile={vivaldi.currentProfile}
                    setCurrentProfile={vivaldi.setCurrentProfile}
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
        icon="empty-state.png"
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

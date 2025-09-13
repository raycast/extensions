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
import { useEffect, useMemo, useState } from "react";

import PermissionErrorScreen from "./components/PermissionErrorScreen";
import SelectBrowsers from "./components/SelectBrowsers";
import useArcBookmarks from "./hooks/useArcBookmarks";
import useAvailableBrowsers, { BROWSERS_BUNDLE_ID } from "./hooks/useAvailableBrowsers";
import useBraveBetaBookmarks from "./hooks/useBraveBetaBookmarks";
import useBraveBookmarks from "./hooks/useBraveBookmarks";
import useBraveNightlyBookmarks from "./hooks/useBraveNightlyBookmarks";
import useChromeBetaBookmarks from "./hooks/useChromeBetaBookmarks";
import useChromeBookmarks from "./hooks/useChromeBookmarks";
import useChromeDevBookmarks from "./hooks/useChromeDevBookmarks";
import useDiaBookmarks from "./hooks/useDiaBookmarks";
import useEdgeBookmarks from "./hooks/useEdgeBookmarks";
import useEdgeCanaryBookmarks from "./hooks/useEdgeCanaryBookmarks";
import useEdgeDevBookmarks from "./hooks/useEdgeDevBookmarks";
import useFirefoxBookmarks from "./hooks/useFirefoxBookmarks";
import useGhostBrowserBookmarks from "./hooks/useGhostBrowserBookmarks";
import useIslandBookmarks from "./hooks/useIslandBookmarks";
import usePrismaAccessBookmarks from "./hooks/usePrismaAccessBookmarks";
import useSafariBookmarks from "./hooks/useSafariBookmarks";
import useSidekickBookmarks from "./hooks/useSidekickBookmarks";
import useVivaldiBookmarks from "./hooks/useVivaldiBrowser";
import useWhaleBookmarks from "./hooks/useWhaleBookmarks";
import useZenBookmarks from "./hooks/useZenBookmarks";
import { getMacOSDefaultBrowser } from "./utils/browsers";
// Note: frecency is intentionally misspelled: https://wiki.mozilla.org/User:Jesse/NewFrecency.
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

  const { showDomain, openBookmarkBrowser, disableFrecency } = getPreferenceValues<
    Preferences & { disableFrecency?: boolean }
  >();

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

      // We pull the default browser to enable it to eliminate the need for the user to select this on first run
      const defaultBrowser = await getMacOSDefaultBrowser();
      const browsersItem = await LocalStorage.getItem("browsers");

      return browsersItem ? (JSON.parse(browsersItem.toString()) as string[]) : [defaultBrowser];
    },
    [availableBrowsers],
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

  const hasArc = browsers.includes(BROWSERS_BUNDLE_ID.arc) ?? false;
  const hasBrave = browsers.includes(BROWSERS_BUNDLE_ID.brave) ?? false;
  const hasBraveBeta = browsers.includes(BROWSERS_BUNDLE_ID.braveBeta) ?? false;
  const hasBraveNightly = browsers.includes(BROWSERS_BUNDLE_ID.braveNightly) ?? false;
  const hasChrome = browsers.includes(BROWSERS_BUNDLE_ID.chrome) ?? false;
  const hasChromeBeta = browsers.includes(BROWSERS_BUNDLE_ID.chromeBeta) ?? false;
  const hasChromeDev = browsers.includes(BROWSERS_BUNDLE_ID.chromeDev) ?? false;
  const hasDia = browsers.includes(BROWSERS_BUNDLE_ID.dia) ?? false;
  const hasEdge = browsers.includes(BROWSERS_BUNDLE_ID.edge) ?? false;
  const hasEdgeCanary = browsers.includes(BROWSERS_BUNDLE_ID.edgeCanary) ?? false;
  const hasEdgeDev = browsers.includes(BROWSERS_BUNDLE_ID.edgeDev) ?? false;
  const hasFirefox = browsers.includes(BROWSERS_BUNDLE_ID.firefox) ?? false;
  const hasFirefoxDev = browsers.includes(BROWSERS_BUNDLE_ID.firefoxDev) ?? false;
  const hasGhostBrowser = browsers.includes(BROWSERS_BUNDLE_ID.ghostBrowser) ?? false;
  const hasIsland = browsers.includes(BROWSERS_BUNDLE_ID.island) ?? false;
  const hasPrismaAccess = browsers.includes(BROWSERS_BUNDLE_ID.prismaAccess) ?? false;
  const hasSafari = browsers.includes(BROWSERS_BUNDLE_ID.safari) ?? false;
  const hasSidekick = browsers.includes(BROWSERS_BUNDLE_ID.sidekick) ?? false;
  const hasVivaldi = browsers.includes(BROWSERS_BUNDLE_ID.vivaldi) ?? false;
  const hasZen = browsers.includes(BROWSERS_BUNDLE_ID.zen) ?? false;
  const hasWhale = browsers.includes(BROWSERS_BUNDLE_ID.whale) ?? false;

  const arc = useArcBookmarks(hasArc);
  const brave = useBraveBookmarks(hasBrave);
  const braveBeta = useBraveBetaBookmarks(hasBraveBeta);
  const braveNightly = useBraveNightlyBookmarks(hasBraveNightly);
  const chrome = useChromeBookmarks(hasChrome);
  const chromeBeta = useChromeBetaBookmarks(hasChromeBeta);
  const chromeDev = useChromeDevBookmarks(hasChromeDev);
  const dia = useDiaBookmarks(hasDia);
  const edge = useEdgeBookmarks(hasEdge);
  const edgeCanary = useEdgeCanaryBookmarks(hasEdgeCanary);
  const edgeDev = useEdgeDevBookmarks(hasEdgeDev);
  const firefox = useFirefoxBookmarks(hasFirefox || hasFirefoxDev);
  const ghostBrowser = useGhostBrowserBookmarks(hasGhostBrowser);
  const island = useIslandBookmarks(hasIsland);
  const prismaAccess = usePrismaAccessBookmarks(hasPrismaAccess);
  const safari = useSafariBookmarks(hasSafari);
  const sidekick = useSidekickBookmarks(hasSidekick);
  const vivaldi = useVivaldiBookmarks(hasVivaldi);
  const whale = useWhaleBookmarks(hasWhale);
  const zen = useZenBookmarks(hasZen);

  const [bookmarks, setBookmarks] = useCachedState<Bookmark[]>("bookmarks", []);
  const [folders, setFolders] = useCachedState<Folder[]>("folders", []);

  useEffect(() => {
    const bookmarks = [
      ...arc.bookmarks,
      ...brave.bookmarks,
      ...braveBeta.bookmarks,
      ...braveNightly.bookmarks,
      ...chrome.bookmarks,
      ...chromeBeta.bookmarks,
      ...chromeDev.bookmarks,
      ...dia.bookmarks,
      ...edge.bookmarks,
      ...edgeCanary.bookmarks,
      ...edgeDev.bookmarks,
      ...firefox.bookmarks,
      ...ghostBrowser.bookmarks,
      ...island.bookmarks,
      ...prismaAccess.bookmarks,
      ...safari.bookmarks,
      ...sidekick.bookmarks,
      ...vivaldi.bookmarks,
      ...whale.bookmarks,
      ...zen.bookmarks,
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
        if (!disableFrecency) {
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
        }

        // If both frecencies are undefined, sort by title
        return a.title?.localeCompare(b.title);
      });

    setBookmarks(bookmarks);
  }, [
    arc.bookmarks,
    brave.bookmarks,
    braveBeta.bookmarks,
    braveNightly.bookmarks,
    chrome.bookmarks,
    chromeBeta.bookmarks,
    chromeDev.bookmarks,
    dia.bookmarks,
    edge.bookmarks,
    edgeCanary.bookmarks,
    edgeDev.bookmarks,
    firefox.bookmarks,
    ghostBrowser.bookmarks,
    island.bookmarks,
    prismaAccess.bookmarks,
    safari.bookmarks,
    sidekick.bookmarks,
    vivaldi.bookmarks,
    whale.bookmarks,
    zen.bookmarks,
    frecencies,
    disableFrecency,
    setBookmarks,
  ]);

  useEffect(() => {
    const folders = [
      ...arc.folders,
      ...brave.folders,
      ...braveBeta.folders,
      ...braveNightly.folders,
      ...chrome.folders,
      ...chromeBeta.folders,
      ...chromeDev.folders,
      ...dia.folders,
      ...edge.folders,
      ...edgeCanary.folders,
      ...edgeDev.folders,
      ...firefox.folders,
      ...ghostBrowser.folders,
      ...island.folders,
      ...prismaAccess.folders,
      ...safari.folders,
      ...sidekick.folders,
      ...vivaldi.folders,
      ...whale.folders,
      ...zen.folders,
    ];

    setFolders(folders);
  }, [
    arc.folders,
    brave.folders,
    braveBeta.folders,
    braveNightly.folders,
    chrome.folders,
    chromeBeta.folders,
    chromeDev.folders,
    dia.folders,
    edge.folders,
    edgeCanary.folders,
    edgeDev.folders,
    firefox.folders,
    ghostBrowser.folders,
    island.folders,
    prismaAccess.folders,
    safari.folders,
    sidekick.folders,
    vivaldi.folders,
    whale.folders,
    zen.folders,
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
      includeScore: true,
      ignoreLocation: true,
    });
  }, [folderBookmarks]);

  // Limit display to 100 bookmarks to avoid heap memory errors
  // Use custom filtering instead of native filtering
  const filteredBookmarks = useMemo(() => {
    if (query === "") {
      return folderBookmarks;
    }

    const searchResults = fuse.search(query);

    return searchResults
      .sort((a, b) => {
        if (!disableFrecency) {
          if (a.item.bookmarkFrecency && !b.item.bookmarkFrecency) return -1;
          if (!a.item.bookmarkFrecency && b.item.bookmarkFrecency) return 1;
          if (a.item.bookmarkFrecency && b.item.bookmarkFrecency) {
            return b.item.bookmarkFrecency.frecency - a.item.bookmarkFrecency.frecency;
          }
        }
        return (a.score || 1) - (b.score || 1);
      })
      .map((result) => result.item);
  }, [folderBookmarks, fuse, query, disableFrecency]);

  const filteredFolders = useMemo(() => {
    return folders.filter((item) => {
      if (!item.title) {
        return false;
      }

      return bookmarks.some((bookmark) => bookmark.browser === item.browser && bookmark.folder.includes(item.title));
    });
  }, [folders, bookmarks]);

  function mutateBookmarks() {
    if (hasArc) {
      arc.mutate();
    }
    if (hasBrave) {
      brave.mutate();
    }
    if (hasBraveBeta) {
      braveBeta.mutate();
    }
    if (hasBraveNightly) {
      braveNightly.mutate();
    }
    if (hasChrome) {
      chrome.mutate();
    }
    if (hasChromeBeta) {
      chromeBeta.mutate();
    }
    if (hasChromeDev) {
      chromeDev.mutate();
    }
    if (hasDia) {
      dia.mutate();
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
    if (hasFirefox || hasFirefoxDev) {
      firefox.mutate();
    }
    if (hasGhostBrowser) {
      ghostBrowser.mutate();
    }
    if (hasIsland) {
      island.mutate();
    }
    if (hasPrismaAccess) {
      prismaAccess.mutate();
    }
    if (hasSafari) {
      safari.mutate();
    }
    if (hasSidekick) {
      sidekick.mutate();
    }
    if (hasVivaldi) {
      vivaldi.mutate();
    }
    if (hasWhale) {
      whale.mutate();
    }
    if (hasZen) {
      zen.mutate();
    }
  }

  async function updateFrecency(item: { id: string; title: string; url: string; folder: string }) {
    const frecency = frecencies[item.id];

    await LocalStorage.setItem(
      "frecencies",
      JSON.stringify({
        ...frecencies,
        [item.id]: getBookmarkFrecency(frecency),
      }),
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

  // Get the browser name from the bundle ID to open the bookmark's in its associated browser
  function browserBundleToName(bundleId: string) {
    return availableBrowsers?.find((browser) => browser.bundleId === bundleId)?.name;
  }

  return (
    <List
      isLoading={
        isLoadingBrowsers ||
        isLoadingFrecencies ||
        arc.isLoading ||
        brave.isLoading ||
        braveBeta.isLoading ||
        braveNightly.isLoading ||
        chrome.isLoading ||
        chromeBeta.isLoading ||
        chromeDev.isLoading ||
        dia.isLoading ||
        edge.isLoading ||
        edgeCanary.isLoading ||
        edgeDev.isLoading ||
        firefox.isLoading ||
        ghostBrowser.isLoading ||
        island.isLoading ||
        prismaAccess.isLoading ||
        safari.isLoading ||
        sidekick.isLoading ||
        vivaldi.isLoading ||
        whale.isLoading ||
        zen.isLoading
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
                {openBookmarkBrowser ? (
                  <Action.Open
                    title="Open in Browser"
                    application={openBookmarkBrowser ? browserBundleToName(item.browser) : undefined}
                    target={item.url}
                    onOpen={() => updateFrecency(item)}
                  />
                ) : (
                  <Action.OpenInBrowser url={item.url} onOpen={() => updateFrecency(item)} />
                )}

                <Action.CopyToClipboard title="Copy Link" content={item.url} onCopy={() => updateFrecency(item)} />

                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => removeFrecency(item)} />

                <ActionPanel.Section>
                  {availableBrowsers && availableBrowsers.length > 1 ? (
                    <SelectBrowserAction browsers={browsers} setBrowsers={setBrowsers} />
                  ) : null}

                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.arc}
                    name="Arc"
                    icon="arc.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    profiles={arc.profiles}
                    currentProfile={arc.currentProfile}
                    setCurrentProfile={arc.setCurrentProfile}
                  />
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
                    bundleId={BROWSERS_BUNDLE_ID.braveNightly}
                    name="Brave Nightly"
                    icon="brave.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    profiles={braveNightly.profiles}
                    currentProfile={braveNightly.currentProfile}
                    setCurrentProfile={braveNightly.setCurrentProfile}
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
                    bundleId={BROWSERS_BUNDLE_ID.chromeBeta}
                    name="Chrome Beta"
                    icon="chrome-beta.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    profiles={chromeBeta.profiles}
                    currentProfile={chromeBeta.currentProfile}
                    setCurrentProfile={chromeBeta.setCurrentProfile}
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
                    bundleId={BROWSERS_BUNDLE_ID.dia}
                    name="Dia"
                    icon="dia.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    profiles={dia.profiles}
                    currentProfile={dia.currentProfile}
                    setCurrentProfile={dia.setCurrentProfile}
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
                    bundleId={BROWSERS_BUNDLE_ID.firefoxDev}
                    name="Firefox Dev"
                    icon="firefoxDev.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    profiles={firefox.profiles}
                    currentProfile={firefox.currentProfile}
                    setCurrentProfile={firefox.setCurrentProfile}
                  />
                  {/* Note: Ghost Browser doesn't seem to have a profile feature - no profile switching submenu added for it. */}
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.island}
                    name="Island"
                    icon="island.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    profiles={island.profiles}
                    currentProfile={island.currentProfile}
                    setCurrentProfile={island.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.prismaAccess}
                    name="Prisma Access"
                    icon="prisma-access.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    profiles={prismaAccess.profiles}
                    currentProfile={prismaAccess.currentProfile}
                    setCurrentProfile={prismaAccess.setCurrentProfile}
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
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.whale}
                    name="Whale"
                    icon="whale.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                    profiles={whale.profiles}
                    currentProfile={whale.currentProfile}
                    setCurrentProfile={whale.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.zen}
                    name="Zen"
                    icon="zen.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
                    profiles={zen.profiles}
                    currentProfile={zen.currentProfile}
                    setCurrentProfile={zen.setCurrentProfile}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CreateQuicklink
                    title="Create Quicklink"
                    icon={Icon.Link}
                    quicklink={{
                      name: item.title,
                      link: item.url,
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
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

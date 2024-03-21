import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getMacOSDefaultBrowser } from "../helpers/browsers";
import { BookmarkFrecency, getBookmarkFrecency } from "../helpers/frecency";
import { fuzzyMatch } from "../helpers/search";
import useArcBookmarks from "../hooks/useArcBookmarks";
import useAvailableBrowsers, { BROWSERS_BUNDLE_ID } from "../hooks/useAvailableBrowsers";
import useBraveBetaBookmarks from "../hooks/useBraveBetaBookmarks";
import useBraveBookmarks from "../hooks/useBraveBookmarks";
import useBraveNightlyBookmarks from "../hooks/useBraveNightlyBookmarks";
import useChromeBetaBookmarks from "../hooks/useChromeBetaBookmarks";
import useChromeBookmarks from "../hooks/useChromeBookmarks";
import useChromeDevBookmarks from "../hooks/useChromeDevBookmarks";
import useEdgeBookmarks from "../hooks/useEdgeBookmarks";
import useEdgeCanaryBookmarks from "../hooks/useEdgeCanaryBookmarks";
import useEdgeDevBookmarks from "../hooks/useEdgeDevBookmarks";
import useFirefoxBookmarks from "../hooks/useFirefoxBookmarks";
import useSafariBookmarks from "../hooks/useSafariBookmarks";
import useSidekickBookmarks from "../hooks/useSidekickBookmarks";
import useVivaldiBookmarks from "../hooks/useVivaldiBrowser";

export type Bookmark = {
  id: string;
  browser: string;
  title: string;
  url: string;
  folder: string;
  domain: string;
  bookmarkFrecency?: BookmarkFrecency;
};

type UseBookmarksProps = {
  query: string;
  selectedFolderId: string;
};

export default function useBookmarks({ query, selectedFolderId }: UseBookmarksProps) {
  const { data: availableBrowsers } = useAvailableBrowsers();

  const {
    data: browsers,
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
    data: frecencies,
    isLoading: isLoadingFrecencies,
    mutate: mutateFrecencies,
  } = useCachedPromise(async () => {
    const frecenciesItem = await LocalStorage.getItem("frecencies");

    return frecenciesItem
      ? (JSON.parse(frecenciesItem.toString()) as Record<string, BookmarkFrecency | undefined>)
      : {};
  });

  const hasArc = browsers?.includes(BROWSERS_BUNDLE_ID.arc) ?? false;
  const hasBrave = browsers?.includes(BROWSERS_BUNDLE_ID.brave) ?? false;
  const hasBraveBeta = browsers?.includes(BROWSERS_BUNDLE_ID.braveBeta) ?? false;
  const hasBraveNightly = browsers?.includes(BROWSERS_BUNDLE_ID.braveNightly) ?? false;
  const hasChrome = browsers?.includes(BROWSERS_BUNDLE_ID.chrome) ?? false;
  const hasChromeBeta = browsers?.includes(BROWSERS_BUNDLE_ID.chromeBeta) ?? false;
  const hasChromeDev = browsers?.includes(BROWSERS_BUNDLE_ID.chromeDev) ?? false;
  const hasEdge = browsers?.includes(BROWSERS_BUNDLE_ID.edge) ?? false;
  const hasEdgeCanary = browsers?.includes(BROWSERS_BUNDLE_ID.edgeCanary) ?? false;
  const hasEdgeDev = browsers?.includes(BROWSERS_BUNDLE_ID.edgeDev) ?? false;
  const hasFirefox = browsers?.includes(BROWSERS_BUNDLE_ID.firefox) ?? false;
  const hasFirefoxDev = browsers?.includes(BROWSERS_BUNDLE_ID.firefoxDev) ?? false;
  const hasSafari = browsers?.includes(BROWSERS_BUNDLE_ID.safari) ?? false;
  const hasSidekick = browsers?.includes(BROWSERS_BUNDLE_ID.sidekick) ?? false;
  const hasVivaldi = browsers?.includes(BROWSERS_BUNDLE_ID.vivaldi) ?? false;

  const arc = useArcBookmarks(hasArc);
  const firefox = useFirefoxBookmarks(hasFirefox || hasFirefoxDev);
  const safari = useSafariBookmarks(hasSafari);

  // Chromium browsers
  const brave = useBraveBookmarks(hasBrave, query);
  const braveBeta = useBraveBetaBookmarks(hasBraveBeta, query);
  const braveNightly = useBraveNightlyBookmarks(hasBraveNightly, query);
  const chrome = useChromeBookmarks(hasChrome, query);
  const chromeBeta = useChromeBetaBookmarks(hasChromeBeta, query);
  const chromeDev = useChromeDevBookmarks(hasChromeDev, query);
  const edge = useEdgeBookmarks(hasEdge, query);
  const edgeCanary = useEdgeCanaryBookmarks(hasEdgeCanary, query);
  const edgeDev = useEdgeDevBookmarks(hasEdgeDev, query);
  const sidekick = useSidekickBookmarks(hasSidekick, query);
  const vivaldi = useVivaldiBookmarks(hasVivaldi, query);

  const bookmarks = useMemo(() => {
    const bookmarks = [
      ...arc.bookmarks,
      ...brave.bookmarks,
      ...braveBeta.bookmarks,
      ...braveNightly.bookmarks,
      ...chrome.bookmarks,
      ...chromeBeta.bookmarks,
      ...chromeDev.bookmarks,
      ...edge.bookmarks,
      ...edgeCanary.bookmarks,
      ...edgeDev.bookmarks,
      ...firefox.bookmarks,
      ...safari.bookmarks,
      ...sidekick.bookmarks,
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

        return { ...item, domain, bookmarkFrecency: frecencies?.[item.id] };
      })
      .sort((a, b) => {
        // If a has a frecency, but b doesn't, a should come first
        if (a.bookmarkFrecency && !b.bookmarkFrecency) return -1;
        // If b has a frecency, but a doesn't, b should come first
        if (!a.bookmarkFrecency && b.bookmarkFrecency) return 1;
        // If both frecencies are defined,put the one with the higher frecency first
        if (a.bookmarkFrecency && b.bookmarkFrecency) {
          return b.bookmarkFrecency.frecency - a.bookmarkFrecency.frecency;
        }

        // If both frecencies are undefined, sort by title
        return a.title?.localeCompare(b.title);
      });

    return bookmarks;
  }, [
    arc.bookmarks,
    brave.bookmarks,
    braveBeta.bookmarks,
    braveNightly.bookmarks,
    chrome.bookmarks,
    chromeBeta.bookmarks,
    chromeDev.bookmarks,
    edge.bookmarks,
    edgeCanary.bookmarks,
    edgeDev.bookmarks,
    firefox.bookmarks,
    safari.bookmarks,
    sidekick.bookmarks,
    vivaldi.bookmarks,
    frecencies,
  ]);

  const folders = useMemo(
    () => [
      ...arc.folders,
      ...brave.folders,
      ...braveBeta.folders,
      ...braveNightly.folders,
      ...chrome.folders,
      ...chromeBeta.folders,
      ...chromeDev.folders,
      ...edge.folders,
      ...edgeCanary.folders,
      ...edgeDev.folders,
      ...firefox.folders,
      ...safari.folders,
      ...sidekick.folders,
      ...vivaldi.folders,
    ],
    [
      arc.folders,
      brave.folders,
      braveBeta.folders,
      braveNightly.folders,
      chrome.folders,
      chromeBeta.folders,
      chromeDev.folders,
      edge.folders,
      edgeCanary.folders,
      edgeDev.folders,
      firefox.folders,
      safari.folders,
      sidekick.folders,
      vivaldi.folders,
    ],
  );

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

  const filteredFolders = useMemo(() => {
    return folders.filter((item) => {
      if (!item.title) {
        return false;
      }

      return bookmarks.some((bookmark) => bookmark.browser === item.browser && bookmark.folder.includes(item.title));
    });
  }, [folders, bookmarks]);

  function mutate() {
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
    if (hasSafari) {
      safari.mutate();
    }
    if (hasSidekick) {
      sidekick.mutate();
    }
    if (hasVivaldi) {
      vivaldi.mutate();
    }
  }

  async function updateFrecency(item: { id: string; title: string; url: string; folder: string }) {
    const frecency = frecencies?.[item.id];

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
      delete frecencies?.[item.id];
      await LocalStorage.setItem("frecencies", JSON.stringify(frecencies));
      await showToast({ style: Toast.Style.Success, title: "Reset bookmark's ranking" });
      mutateFrecencies();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not reset bookmark's ranking" });
    }
  }

  const filteredBookmarks = useMemo(
    () => folderBookmarks.filter((item) => fuzzyMatch(item, query)),
    [query, folderBookmarks],
  );

  const isLoading =
    isLoadingBrowsers ||
    isLoadingFrecencies ||
    arc.isLoading ||
    brave.isLoading ||
    braveBeta.isLoading ||
    braveNightly.isLoading ||
    chrome.isLoading ||
    chromeBeta.isLoading ||
    chromeDev.isLoading ||
    edge.isLoading ||
    edgeCanary.isLoading ||
    edgeDev.isLoading ||
    firefox.isLoading ||
    safari.isLoading ||
    sidekick.isLoading ||
    vivaldi.isLoading;

  return {
    bookmarks: filteredBookmarks,
    folders: filteredFolders,
    mutate,
    updateFrecency,
    removeFrecency,
    availableBrowsers,
    browsers: browsers ?? [],
    setBrowsers,
    isLoading,
    error: safari.error,
    hooks: {
      arc,
      brave,
      braveBeta,
      braveNightly,
      chrome,
      chromeBeta,
      chromeDev,
      edge,
      edgeCanary,
      edgeDev,
      firefox,
      safari,
      sidekick,
      vivaldi,
    },
  };
}

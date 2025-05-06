import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ActionPanel, Action, List, Icon, useNavigation } from "@raycast/api";
import fuzzysort from "fuzzysort";
import useChromeBookmarks from "../browser-bookmark-hooks/useChromeBookmarks";
import useSafariBookmarks from "../browser-bookmark-hooks/useSafariBookmarks";
import useFirefoxBookmarks from "../browser-bookmark-hooks/useFirefoxBookmarks";
import useArcBookmarks from "../browser-bookmark-hooks/useArcBookmarks";
import useBraveBookmarks from "../browser-bookmark-hooks/useBraveBookmarks";
import useEdgeBookmarks from "../browser-bookmark-hooks/useEdgeBookmarks";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { RouterOutputs } from "../utils/trpc.util";
import { ImportBookmarksForm } from "./ImportBookmarksForm";
import { BrowserBookmark } from "../types";
import useZenBookmarks from "../browser-bookmark-hooks/useZenBookmarks";
import useVivaldiBrowser from "../browser-bookmark-hooks/useVivaldiBrowser";
import useWhaleBookmarks from "../browser-bookmark-hooks/useWhaleBookmarks";
import useSidekickBookmarks from "../browser-bookmark-hooks/useSidekickBookmarks";
import useIslandBookmarks from "../browser-bookmark-hooks/useIslandBookmarks";
import usePrismaAccessBookmarks from "../browser-bookmark-hooks/usePrismaAccessBookmarks";
import useChromeBetaBookmarks from "../browser-bookmark-hooks/useChromeBetaBookmarks";
import useChromeDevBookmarks from "../browser-bookmark-hooks/useChromeDevBookmarks";
import useEdgeDevBookmarks from "../browser-bookmark-hooks/useEdgeDevBookmarks";
import useEdgeCanaryBookmarks from "../browser-bookmark-hooks/useEdgeCanaryBookmarks";
import useBraveBetaBookmarks from "../browser-bookmark-hooks/useBraveBetaBookmarks";
import useBraveNightlyBookmarks from "../browser-bookmark-hooks/useBraveNightlyBookmarks";
import { BROWSERS_BUNDLE_ID } from "../browser-bookmark-hooks/useAvailableBrowsers";
import PermissionErrorScreen from "../browser-bookmark-components/PermissionErrorScreen";
import { useBookmarks } from "../hooks/use-bookmarks.hook";

// To prevent Error: Worker terminated due to reaching memory limit: JS heap out of memory
const LIMIT_AT_ONCE = 100;

interface Props {
  selectedBrowser: string;
  space: RouterOutputs["user"]["me"]["associatedSpaces"][number];
}

function Body(props: Props) {
  const { selectedBrowser, space } = props;
  const [selectedBookmarks, setSelectedBookmarks] = useState<BrowserBookmark[]>([]);
  const { pop } = useNavigation();
  const [keyword, setKeyword] = useState("");
  const existingBookmarks = useBookmarks(space.id);

  const browserName = useMemo(() => {
    if (selectedBrowser === BROWSERS_BUNDLE_ID.chrome) return "Chrome";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.chromeBeta) return "Chrome Beta";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.chromeDev) return "Chrome Dev";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.safari) return "Safari";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.firefox) return "Firefox";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.firefoxDev) return "Firefox Developer Edition";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.arc) return "Arc";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.brave) return "Brave";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.braveBeta) return "Brave Beta";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.braveNightly) return "Brave Nightly";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.edge) return "Edge";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.edgeDev) return "Edge Dev";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.edgeCanary) return "Edge Canary";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.zen) return "Zen";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.vivaldi) return "Vivaldi";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.island) return "Island";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.sidekick) return "Sidekick";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.prismaAccess) return "Prisma Access";
    if (selectedBrowser === BROWSERS_BUNDLE_ID.whale) return "Whale";
    return "Unknown";
  }, [selectedBrowser]);

  const chromeBookmarks = useChromeBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.chrome);
  const chromeBetaBookmarks = useChromeBetaBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.chromeBeta);
  const chromeDevBookmarks = useChromeDevBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.chromeDev);
  const safariBookmarks = useSafariBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.safari);
  const firefoxBookmarks = useFirefoxBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.firefox);
  const arcBookmarks = useArcBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.arc);
  const braveBookmarks = useBraveBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.brave);
  const braveBetaBookmarks = useBraveBetaBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.braveBeta);
  const braveNightlyBookmarks = useBraveNightlyBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.braveNightly);
  const edgeBookmarks = useEdgeBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.edge);
  const edgeDevBookmarks = useEdgeDevBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.edgeDev);
  const edgeCanaryBookmarks = useEdgeCanaryBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.edgeCanary);
  const zenBookmarks = useZenBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.zen);
  const vivaldiBookmarks = useVivaldiBrowser(selectedBrowser === BROWSERS_BUNDLE_ID.vivaldi);
  const islandBookmarks = useIslandBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.island);
  const sidekickBookmarks = useSidekickBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.sidekick);
  const prismaAccessBookmarks = usePrismaAccessBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.prismaAccess);
  const whaleBookmarks = useWhaleBookmarks(selectedBrowser === BROWSERS_BUNDLE_ID.whale);

  // Combine all bookmarks
  const allBookmarks: BrowserBookmark[] = useMemo(
    () => [
      ...(chromeBookmarks.bookmarks || []),
      ...(chromeBetaBookmarks.bookmarks || []),
      ...(chromeDevBookmarks.bookmarks || []),
      ...(safariBookmarks.bookmarks || []),
      ...(firefoxBookmarks.bookmarks || []),
      ...(arcBookmarks.bookmarks || []),
      ...(braveBookmarks.bookmarks || []),
      ...(braveBetaBookmarks.bookmarks || []),
      ...(braveNightlyBookmarks.bookmarks || []),
      ...(edgeBookmarks.bookmarks || []),
      ...(edgeDevBookmarks.bookmarks || []),
      ...(edgeCanaryBookmarks.bookmarks || []),
      ...(zenBookmarks.bookmarks || []),
      ...(vivaldiBookmarks.bookmarks || []),
      ...(islandBookmarks.bookmarks || []),
      ...(sidekickBookmarks.bookmarks || []),
      ...(prismaAccessBookmarks.bookmarks || []),
      ...(whaleBookmarks.bookmarks || []),
    ],
    [
      chromeBookmarks.bookmarks,
      chromeBetaBookmarks.bookmarks,
      chromeDevBookmarks.bookmarks,
      safariBookmarks.bookmarks,
      firefoxBookmarks.bookmarks,
      arcBookmarks.bookmarks,
      braveBookmarks.bookmarks,
      braveBetaBookmarks.bookmarks,
      braveNightlyBookmarks.bookmarks,
      edgeBookmarks.bookmarks,
      edgeDevBookmarks.bookmarks,
      edgeCanaryBookmarks.bookmarks,
      zenBookmarks.bookmarks,
      vivaldiBookmarks.bookmarks,
      islandBookmarks.bookmarks,
      sidekickBookmarks.bookmarks,
      prismaAccessBookmarks.bookmarks,
      whaleBookmarks.bookmarks,
    ],
  );

  const isLoadingBookmarks =
    chromeBookmarks.isLoading ||
    chromeBetaBookmarks.isLoading ||
    chromeDevBookmarks.isLoading ||
    safariBookmarks.isLoading ||
    firefoxBookmarks.isLoading ||
    arcBookmarks.isLoading ||
    braveBookmarks.isLoading ||
    braveBetaBookmarks.isLoading ||
    braveNightlyBookmarks.isLoading ||
    edgeBookmarks.isLoading ||
    edgeDevBookmarks.isLoading ||
    edgeCanaryBookmarks.isLoading ||
    zenBookmarks.isLoading ||
    vivaldiBookmarks.isLoading ||
    islandBookmarks.isLoading ||
    sidekickBookmarks.isLoading ||
    prismaAccessBookmarks.isLoading ||
    whaleBookmarks.isLoading;

  const importAvailableBookmarks = useMemo(() => {
    if (!existingBookmarks.data) return undefined;
    if (!allBookmarks) return undefined;

    return allBookmarks.filter((b) => !existingBookmarks.data.some((eb) => eb.url === b.url));
  }, [existingBookmarks.data, allBookmarks]);

  const preparedBookmarks = useMemo(() => {
    if (!importAvailableBookmarks) return [];

    return importAvailableBookmarks.map((bookmark) => ({
      original: bookmark,
      titlePrepared: fuzzysort.prepare(bookmark.title || ""),
      urlPrepared: fuzzysort.prepare(bookmark.url || ""),
      folderPrepared: fuzzysort.prepare(bookmark.folder || ""),
    }));
  }, [importAvailableBookmarks]);

  const filtered = useMemo(() => {
    if (!importAvailableBookmarks) return undefined;
    if (!keyword) return importAvailableBookmarks.slice(0, LIMIT_AT_ONCE);

    const results = preparedBookmarks
      .map((item) => {
        const titleResult = fuzzysort.single(keyword, item.titlePrepared);
        const urlResult = fuzzysort.single(keyword, item.urlPrepared);
        const folderResult = fuzzysort.single(keyword, item.folderPrepared);

        // Select the best score
        const bestScore = [titleResult?.score, urlResult?.score, folderResult?.score]
          .filter((score) => score !== undefined)
          .reduce(
            (best, current) => (current && (best === undefined || current > best) ? current : best),
            undefined as number | undefined,
          );

        return {
          item: item.original,
          score: bestScore,
        };
      })
      .filter((result) => result.score !== undefined)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((result) => result.item)
      .slice(0, LIMIT_AT_ONCE);

    return results;
  }, [importAvailableBookmarks, keyword, preparedBookmarks]);

  const toggleBookmarkSelection = (bookmark: BrowserBookmark) => {
    setSelectedBookmarks((prev) =>
      prev.some((b) => b.id === bookmark.id) ? prev.filter((b) => b.id !== bookmark.id) : [...prev, bookmark],
    );
  };

  const selectAllBookmarks = useCallback(() => {
    if (!filtered) return;

    setSelectedBookmarks([...filtered]);
  }, [filtered]);

  const deselectAllBookmarks = useCallback(() => {
    setSelectedBookmarks([]);
  }, []);

  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!filtered) return;
    if (hasLoaded.current) return;

    hasLoaded.current = true;
    setSelectedBookmarks([...filtered]);
  }, [filtered]);

  const onPop = () => {
    existingBookmarks.refetch();
    setSelectedBookmarks([]);
  };

  if (!filtered || !importAvailableBookmarks) return null;

  if (safariBookmarks.error?.message.includes("operation not permitted")) {
    return <PermissionErrorScreen />;
  }

  return (
    <List
      isLoading={isLoadingBookmarks}
      searchBarPlaceholder="Search bookmarks..."
      navigationTitle="Import Bookmarks"
      searchText={keyword}
      onSearchTextChange={setKeyword}
    >
      <List.Section
        title={browserName}
        subtitle={`Selected ${selectedBookmarks.length} of Total ${allBookmarks.length}, ${allBookmarks.length - importAvailableBookmarks.length} are already imported in ${space.name}`}
      >
        {filtered.map((bookmark) => {
          const isSelected = selectedBookmarks.some((b) => b.id === bookmark.id);

          return (
            <List.Item
              key={bookmark.id}
              title={bookmark.title}
              subtitle={bookmark.url}
              icon={isSelected ? { source: Icon.CheckCircle, tintColor: "green" } : { source: Icon.Circle }}
              accessories={[{ text: bookmark.folder || "No folder" }]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect Bookmark" : "Select Bookmark"}
                    icon={isSelected ? Icon.Circle : { source: Icon.CheckCircle, tintColor: "green" }}
                    onAction={() => toggleBookmarkSelection(bookmark)}
                  />
                  <Action.Push
                    title={`Import Selected ${selectedBookmarks.length} Bookmarks to ${space.name}`}
                    icon={space.image ? { source: space.image } : space?.type === "TEAM" ? Icon.TwoPeople : Icon.Person}
                    onPop={onPop}
                    target={
                      <ImportBookmarksForm
                        browserName={browserName}
                        spaceId={space.id}
                        spaceName={space.name}
                        bookmarks={selectedBookmarks}
                      />
                    }
                  />
                  <Action
                    title="Select All Bookmarks"
                    icon={{ source: Icon.CheckCircle, tintColor: "green" }}
                    onAction={selectAllBookmarks}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  <Action
                    title="Deselect All Bookmarks"
                    icon={Icon.Circle}
                    onAction={deselectAllBookmarks}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {allBookmarks.length === 0 && !isLoadingBookmarks && (
        <List.EmptyView
          title="No bookmarks found"
          description={"Select different browsers to import bookmarks from"}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Back to Browser Selection" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export function BookmarksImportFromBrowserView(props: Props) {
  return (
    <CachedQueryClientProvider>
      <Body {...props} />
    </CachedQueryClientProvider>
  );
}

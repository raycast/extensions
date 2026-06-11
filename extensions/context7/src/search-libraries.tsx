import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { searchLibraries } from "./lib/context7";
import { createSearchContextDeeplink } from "./lib/deeplink";
import { isAbortError, toErrorMessage } from "./lib/error-utils";
import { getFavoriteLibraries, toggleFavoriteLibrary } from "./lib/favorites";
import { SearchDocumentationView } from "./search-documentation";
import type { FavoriteLibrary, LibrarySummary } from "./lib/types";

const SEARCH_DEBOUNCE_MS = 250;

export default function SearchLibrariesCommand() {
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState<FavoriteLibrary[]>([]);
  const [results, setResults] = useState<LibrarySummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  useEffect(() => {
    void refreshFavorites();
  }, []);

  useEffect(() => {
    const trimmedSearchText = searchText.trim();

    if (!trimmedSearchText) {
      setResults([]);
      setErrorMessage(undefined);
      setIsLoadingResults(false);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      void (async () => {
        setIsLoadingResults(true);
        setErrorMessage(undefined);

        try {
          const libraries = await searchLibraries(trimmedSearchText, abortController.signal);
          setResults(libraries);
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }

          const message = toErrorMessage(error);
          setResults([]);
          setErrorMessage(message);
          await showFailureToast("Search failed", message);
        } finally {
          setIsLoadingResults(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [searchText]);

  const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
  const showingFavorites = searchText.trim().length === 0;

  return (
    <List
      isLoading={isLoadingFavorites || isLoadingResults}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Context7 libraries..."
    >
      <List.EmptyView
        title={getEmptyTitle(showingFavorites, favorites.length, errorMessage)}
        description={getEmptyDescription(showingFavorites, errorMessage)}
      />

      {showingFavorites ? (
        <List.Section title="Favorites" subtitle={favorites.length.toString()}>
          {favorites.map((library) => (
            <LibraryListItem key={library.id} library={library} isFavorite={true} onFavoriteChange={refreshFavorites} />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Results" subtitle={results.length.toString()}>
          {results.map((library) => (
            <LibraryListItem
              key={library.id}
              library={library}
              isFavorite={favoriteIds.has(library.id)}
              onFavoriteChange={refreshFavorites}
            />
          ))}
        </List.Section>
      )}
    </List>
  );

  async function refreshFavorites() {
    setIsLoadingFavorites(true);

    try {
      setFavorites(await getFavoriteLibraries());
    } finally {
      setIsLoadingFavorites(false);
    }
  }
}

function LibraryListItem(props: {
  library: LibrarySummary;
  isFavorite: boolean;
  onFavoriteChange: () => Promise<void>;
}) {
  const { library, isFavorite, onFavoriteChange } = props;
  const quicklinkName = `Search Documentation in ${library.name}`;

  return (
    <List.Item
      title={library.name}
      subtitle={formatLibraryIdentifier(library.id)}
      icon={getLibraryIcon(library.id)}
      accessories={buildLibraryAccessories(library)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Search Documentation"
              icon={Icon.MagnifyingGlass}
              target={<SearchDocumentationView libraryId={library.id} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isFavorite ? "Remove Favorite" : "Add Favorite"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => handleToggleFavorite(library, onFavoriteChange)}
            />
            <Action.CreateQuicklink
              title="Create Quicklink"
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              quicklink={{
                link: createSearchContextDeeplink(library),
                name: quicklinkName,
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function handleToggleFavorite(library: LibrarySummary, onFavoriteChange: () => Promise<void>) {
  try {
    await toggleFavoriteLibrary(library);
    await onFavoriteChange();
  } catch (error) {
    await showFailureToast("Could not update favorites", toErrorMessage(error));
  }
}

function buildLibraryAccessories(library: LibrarySummary) {
  const accessories: List.Item.Accessory[] = [];

  const trustScore = buildTrustScoreAccessory(library.trustScore);
  if (trustScore) {
    accessories.push(trustScore);
  }

  if (typeof library.totalSnippets === "number") {
    accessories.push({
      icon: Icon.CodeBlock,
      text: formatCompactNumber(library.totalSnippets),
      tooltip: `${library.totalSnippets.toLocaleString("en-US")} snippets`,
    });
  }

  const updatedAt = buildUpdatedAtAccessory(library.lastUpdateDate);
  if (updatedAt) {
    accessories.push(updatedAt);
  }

  return accessories;
}

function buildUpdatedAtAccessory(lastUpdateDate?: string): List.Item.Accessory | undefined {
  if (!lastUpdateDate) {
    return undefined;
  }

  const parsedDate = new Date(lastUpdateDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return {
    date: parsedDate,
    tooltip: `Updated: ${new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsedDate)}`,
  };
}

function buildTrustScoreAccessory(trustScore?: number): List.Item.Accessory | undefined {
  if (typeof trustScore !== "number") {
    return undefined;
  }

  return {
    tag: {
      value: trustScore.toFixed(1),
      color: getTrustScoreColor(trustScore),
    },
    tooltip: `Trust score: ${trustScore.toFixed(1)}`,
  };
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function getTrustScoreColor(trustScore: number) {
  if (trustScore >= 9) {
    return Color.Green;
  }

  if (trustScore >= 7) {
    return Color.Orange;
  }

  return Color.Red;
}

function getLibraryIcon(libraryId: string) {
  if (libraryId.startsWith("/websites")) {
    return Icon.Globe;
  }

  if (libraryId.startsWith("/llmstxt")) {
    return Icon.TextDocument;
  }

  return Icon.Code;
}

function formatLibraryIdentifier(libraryId: string) {
  if (libraryId.startsWith("/websites")) {
    return libraryId.replace(/^\/websites\/?/, "");
  }

  if (libraryId.startsWith("/llmstxt")) {
    return libraryId.replace(/^\/llmstxt\/?/, "");
  }

  return libraryId;
}

function getEmptyTitle(showingFavorites: boolean, favoriteCount: number, errorMessage?: string) {
  if (errorMessage) {
    return "Could Not Load Libraries";
  }

  if (showingFavorites && favoriteCount === 0) {
    return "No Favorite Libraries";
  }

  if (showingFavorites) {
    return "Favorite Libraries";
  }

  return "No Matching Libraries";
}

function getEmptyDescription(showingFavorites: boolean, errorMessage?: string) {
  if (errorMessage) {
    return errorMessage;
  }

  if (showingFavorites) {
    return "Start typing to search Context7, or add favorites from the results.";
  }

  return "Try a more specific library name.";
}

async function showFailureToast(title: string, message: string) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}

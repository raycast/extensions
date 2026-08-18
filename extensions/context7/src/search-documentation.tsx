import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { useCallback, useEffect, useMemo, useState } from "react";

import { searchContext } from "./lib/context7";
import { AllLibrariesSearch } from "./components/all-libraries-search";
import { isAbortError, showErrorToast, toErrorMessage } from "./lib/error-utils";
import {
  MAX_LOCAL_MATCHES,
  cacheLoadedDocs,
  loadLibraryDocs,
  prepareSearchIndex,
  searchIndex,
} from "./lib/library-docs";
import { useSearchText } from "./hooks/use-search-text";
import { formatLibraryLabel } from "./lib/library-format";
import { getMyLibraries, isSavedLibrary, toggleLibrary } from "./lib/my-libraries";
import { getMySnippets, snippetKey } from "./lib/my-snippets";
import { SnippetRow } from "./components/snippet-row";
import type { ContextSnippet, LibrarySummary, SavedLibrary } from "./lib/types";

const SEARCH_DEBOUNCE_MS = 250;
const ALL_LIBRARIES = "all";

type SearchContextProps = LaunchProps<{ arguments: Arguments.SearchDocumentation }>;

/**
 * Launched from the root search the library is unknown, so the command picks one from My
 * Libraries rather than demanding a raw library ID nobody has memorized. A Quicklink or an
 * Action.Push still passes the ID directly and skips the picker.
 */
export default function SearchDocumentationCommand(props: SearchContextProps) {
  const launchLibraryId = props.arguments?.libraryId?.trim();
  const [libraries, setLibraries] = useState<SavedLibrary[]>([]);
  const [pickedLibraryId, setPickedLibraryId] = useState(ALL_LIBRARIES);
  const [isLoadingLibraries, setIsLoadingLibraries] = useState(true);
  // Owned here, not in the children: switching scope swaps one child for another, and a
  // query held in the child would be lost to the remount.
  const [searchText, setSearchText] = useState("");

  const refreshLibraries = useCallback(async () => {
    try {
      setLibraries(await getMyLibraries());
    } catch (error) {
      await showErrorToast("Could Not Load My Libraries", error);
    } finally {
      setIsLoadingLibraries(false);
    }
  }, []);

  useEffect(() => {
    void refreshLibraries();
  }, [refreshLibraries]);

  if (launchLibraryId) {
    return <SearchDocumentationView libraryId={launchLibraryId} />;
  }

  if (isLoadingLibraries) {
    return <List isLoading />;
  }

  if (libraries.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Book}
          title="No Library Selected"
          description="Add a library to My Libraries and it appears in the picker here."
          actions={
            <ActionPanel>
              <OpenSearchLibrariesAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Defaults to every library, not to whichever happens to be first. Raycast convention is an
  // unscoped list that the dropdown narrows — pre-selecting one library hides the rest behind
  // a control the user has no reason to open.
  const libraryPicker = (
    <List.Dropdown tooltip="Library" value={pickedLibraryId} storeValue onChange={setPickedLibraryId}>
      <List.Dropdown.Item title="All My Libraries" value={ALL_LIBRARIES} />
      <List.Dropdown.Section title="My Libraries">
        {libraries.map((library) => (
          <List.Dropdown.Item key={library.id} title={library.name} value={library.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  if (pickedLibraryId === ALL_LIBRARIES || !libraries.some((library) => library.id === pickedLibraryId)) {
    return (
      <AllLibrariesSearch
        libraries={libraries}
        libraryPicker={libraryPicker}
        searchText={searchText}
        onSearchTextChange={setSearchText}
      />
    );
  }

  const activeLibraryId = pickedLibraryId;

  return (
    <SearchDocumentationView
      libraryId={activeLibraryId}
      libraryName={libraries.find((library) => library.id === activeLibraryId)?.name}
      librarySummary={libraries.find((library) => library.id === activeLibraryId)}
      onLibraryChange={refreshLibraries}
      libraryPicker={libraryPicker}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    />
  );
}

export function SearchDocumentationView(props: {
  libraryId?: string;
  /** The library's own name where the caller has it — Context7 spells it correctly ("TypeScript"), the ID does not. */
  libraryName?: string;
  /**
   * The full search result where the caller has it. Adding to My Libraries from here would
   * otherwise store only an id and name, and the list would lose its trust score, snippet
   * count, and last-updated accessories.
   */
  librarySummary?: LibrarySummary;
  libraryPicker?: List.Props["searchBarAccessory"];
  /**
   * Called after this view changes My Libraries. A pushed view cannot otherwise tell the list
   * that pushed it, so the parent row would keep rendering a stale star until relaunch.
   */
  onLibraryChange?: () => Promise<void> | void;
  /** Supplied when a parent owns the picker, so the query survives a scope change. */
  searchText?: string;
  onSearchTextChange?: (next: string) => void;
}) {
  const {
    libraryId = "",
    libraryName,
    librarySummary,
    libraryPicker,
    onLibraryChange,
    searchText: externalSearchText,
    onSearchTextChange,
  } = props;
  const libraryLabel = libraryName || formatLibraryLabel(libraryId);

  const [searchText, setSearchText] = useSearchText(externalSearchText, onSearchTextChange);
  const [results, setResults] = useState<ContextSnippet[]>([]);
  const [localSnippets, setLocalSnippets] = useState<ContextSnippet[]>([]);
  const [cachedAt, setCachedAt] = useState<string>();
  const [isSaved, setIsSaved] = useState(false);
  const [savedKeys, setSavedKeys] = useState(new Set<string>());
  const [errorMessage, setErrorMessage] = useState<string>();
  const [localError, setLocalError] = useState<string>();
  // Two independent async sources feed this view. A single flag lets whichever finishes last
  // clear the other's spinner, so they are tracked separately and combined at render time.
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  const refreshSavedKeys = useCallback(async () => {
    try {
      setSavedKeys(new Set((await getMySnippets()).map((snippet) => snippet.key)));
    } catch (error) {
      // A corrupt store would otherwise render every row as unsaved, which reads as data loss.
      await showErrorToast("Could Not Load My Snippets", error);
    }
  }, []);

  useEffect(() => {
    void refreshSavedKeys();
  }, [refreshSavedKeys]);

  // Cached for saved libraries, fetched fresh otherwise. Either way the view opens on content
  // rather than an empty box, and local filtering runs over whatever was loaded.
  useEffect(() => {
    if (!libraryId) {
      return;
    }

    const abortController = new AbortController();
    // `AbortSignal` only cancels the fetch. The LocalStorage lookup and the disk read cannot be
    // aborted, so a superseded run can still resolve and write state belonging to the previous
    // library — its snippets under the new title, or its `finally` clearing the new spinner.
    // Every state write below is gated on this run still being the current one.
    let isCurrent = true;

    void (async () => {
      setLocalSnippets([]);
      setLocalError(undefined);
      setCachedAt(undefined);
      setIsLoadingLocal(true);

      try {
        const saved = await isSavedLibrary(libraryId);
        if (!isCurrent) {
          return;
        }
        setIsSaved(saved);

        const docs = await loadLibraryDocs(libraryId, { isSaved: saved, signal: abortController.signal });
        if (!isCurrent) {
          return;
        }

        setLocalSnippets(docs.snippets);
        setCachedAt(docs.cachedAt);
      } catch (error) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        logger.error("Could not load library documentation", error);
        setLocalError(toErrorMessage(error));
      } finally {
        if (isCurrent) {
          setIsLoadingLocal(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [libraryId]);

  // Semantic search runs against the server; it finds snippets whose wording differs from the
  // query, which local filtering structurally cannot.
  useEffect(() => {
    // Dropped up front, so switching library with a query still typed never renders the
    // previous library's results under the new library's headings.
    setResults([]);

    if (!libraryId || !searchText.trim()) {
      setErrorMessage(undefined);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    // Same reason as the loader below: a superseded run must not write state or clear the
    // spinner belonging to the run that replaced it.
    let isCurrent = true;

    const timeoutId = setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        setErrorMessage(undefined);

        try {
          const snippets = await searchContext(libraryId, searchText.trim(), abortController.signal);

          if (isCurrent) {
            setResults(snippets);
          }
        } catch (error) {
          if (!isCurrent || isAbortError(error)) {
            return;
          }

          setResults([]);

          // showErrorToast awaits, so this run may have been superseded while it resolved —
          // otherwise query A's failure lands on query B's screen.
          const message = await showErrorToast("Search Failed", error);

          if (isCurrent) {
            setErrorMessage(message);
          }
        } finally {
          if (isCurrent) {
            setIsSearching(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [libraryId, searchText]);

  const localIndex = useMemo(() => prepareSearchIndex(localSnippets), [localSnippets]);
  const localMatches = useMemo(() => searchIndex(localIndex, searchText), [localIndex, searchText]);
  const { codeResults, docResults } = useMemo(
    () => ({
      codeResults: results.filter((snippet) => snippet.kind === "code"),
      docResults: results.filter((snippet) => snippet.kind === "docs"),
    }),
    [results],
  );

  const hasQuery = searchText.trim().length > 0;
  const library = { id: libraryId, name: libraryLabel };

  const handleToggleLibrary = async () => {
    try {
      const summary: LibrarySummary = librarySummary ?? { id: libraryId, name: libraryLabel };
      const saved = await toggleLibrary(summary);

      // Derived from what the store actually holds, not from flipping local state — another
      // command may have changed it since this view loaded, and the toast must not lie.
      const nowSaved = saved.some((library) => library.id === libraryId);
      setIsSaved(nowSaved);

      if (nowSaved) {
        // Already fetched — cache what is on screen rather than spending a second request.
        setCachedAt(await cacheLoadedDocs(libraryId, localSnippets));
      } else {
        setCachedAt(undefined);
      }

      await onLibraryChange?.();

      await showToast({
        style: Toast.Style.Success,
        title: nowSaved ? "Added to My Libraries" : "Removed from My Libraries",
        message: libraryLabel,
      });
    } catch (error) {
      await showErrorToast("Could Not Update My Libraries", error);
    }
  };

  const libraryActions = (
    <ActionPanel.Section title={libraryLabel}>
      <Action
        title={isSaved ? "Remove from My Libraries" : "Add to My Libraries"}
        icon={isSaved ? Icon.StarDisabled : Icon.Star}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "." },
          Windows: { modifiers: ["ctrl", "shift"], key: "." },
        }}
        onAction={handleToggleLibrary}
      />
    </ActionPanel.Section>
  );

  if (!libraryId) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Book}
          title="Library Required"
          description="Pick a library in Search Libraries first, or launch this command from a Quicklink."
          actions={
            <ActionPanel>
              <OpenSearchLibrariesAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const renderSection = (title: string, snippets: ContextSnippet[]) =>
    snippets.length === 0 ? null : (
      <List.Section
        key={title}
        title={title}
        subtitle={snippets.length >= MAX_LOCAL_MATCHES ? `${MAX_LOCAL_MATCHES}+` : snippets.length.toString()}
      >
        {snippets.map((snippet, index) => (
          <SnippetRow
            key={`${title}-${snippetKey(snippet, libraryId)}-${index}`}
            snippet={snippet}
            library={library}
            isSaved={savedKeys.has(snippetKey(snippet, libraryId))}
            onSavedChange={refreshSavedKeys}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((showing) => !showing)}
            fallbackTitle={`Snippet ${index + 1}`}
            extraActions={libraryActions}
          />
        ))}
      </List.Section>
    );

  return (
    <List
      isLoading={isSearching || isLoadingLocal}
      isShowingDetail={isShowingDetail && (localMatches.length > 0 || results.length > 0)}
      navigationTitle={`Search Documentation: ${libraryLabel}`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${libraryLabel} documentation...`}
      searchBarAccessory={libraryPicker}
    >
      <List.EmptyView
        icon={errorMessage || localError ? Icon.Warning : Icon.MagnifyingGlass}
        title={getEmptyTitle(searchText, errorMessage, localError)}
        description={errorMessage ?? localError ?? `Type a query to search the ${libraryLabel} documentation.`}
        actions={
          errorMessage || localError ? (
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Error" content={errorMessage ?? localError ?? ""} />
            </ActionPanel>
          ) : undefined
        }
      />

      {renderSection(
        isSaved && cachedAt ? `In ${libraryLabel} (Saved)` : `From the ${libraryLabel} Documentation`,
        localMatches,
      )}
      {hasQuery ? renderSection("Documentation", docResults) : null}
      {hasQuery ? renderSection("Code Snippets", codeResults) : null}
    </List>
  );
}

/**
 * `launchCommand` is the API for launching a sibling command — it reports a real error when
 * the command is disabled, where a `raycast://` deeplink just fails opaquely. Quicklinks are
 * the exception and still need a URL, so `createSearchContextDeeplink` stays.
 */
function OpenSearchLibrariesAction() {
  return (
    <Action
      title="Open Search Libraries"
      icon={Icon.MagnifyingGlass}
      onAction={async () => {
        try {
          await launchCommand({ name: "search-libraries", type: LaunchType.UserInitiated });
        } catch (error) {
          await showErrorToast("Could Not Open Search Libraries", error);
        }
      }}
    />
  );
}

function getEmptyTitle(searchText: string, errorMessage?: string, localError?: string) {
  if (errorMessage || localError) {
    return "Could Not Load Documentation";
  }

  if (!searchText.trim()) {
    return "Search Documentation";
  }

  return "No Results Found";
}

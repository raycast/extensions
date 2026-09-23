import { Icon, List } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { useCallback, useEffect, useMemo, useState } from "react";

import { showErrorToast, toErrorMessage } from "../lib/error-utils";
import { countOf } from "../lib/text";
import { MAX_LOCAL_MATCHES, loadAllCachedDocs, prepareSearchIndex, searchIndex } from "../lib/library-docs";
import { getMySnippets, snippetKey } from "../lib/my-snippets";
import { useSearchText } from "../hooks/use-search-text";
import { SnippetRow } from "./snippet-row";
import type { SavedLibrary, ScopedSnippet } from "../lib/types";

/**
 * Searches every saved library at once, from disk. This is the default scope because it is
 * what "search my documentation" should mean — narrowing to one library is the exception, not
 * the entry point. Cache-only by necessity: see `loadAllCachedDocs`.
 */
export function AllLibrariesSearch(props: {
  libraries: SavedLibrary[];
  libraryPicker: List.Props["searchBarAccessory"];
  /** Supplied when a parent owns the picker, so the query survives a scope change. */
  searchText?: string;
  onSearchTextChange?: (next: string) => void;
}) {
  const { libraries, libraryPicker, searchText: externalSearchText, onSearchTextChange } = props;

  const [searchText, setSearchText] = useSearchText(externalSearchText, onSearchTextChange);
  const [snippets, setSnippets] = useState<ScopedSnippet[]>([]);
  const [uncached, setUncached] = useState<SavedLibrary[]>([]);
  const [savedKeys, setSavedKeys] = useState(new Set<string>());
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
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
    let isCurrent = true;

    void (async () => {
      setIsLoading(true);

      try {
        const { snippets: loaded, uncached: missing } = await loadAllCachedDocs(libraries);

        if (!isCurrent) {
          return;
        }

        setSnippets(loaded);
        setUncached(missing);
      } catch (error) {
        if (isCurrent) {
          logger.error("Could not load cached documentation", error);
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    })();

    void refreshSavedKeys();

    return () => {
      isCurrent = false;
    };
  }, [libraries, refreshSavedKeys]);

  const index = useMemo(() => prepareSearchIndex(snippets), [snippets]);
  const matches = useMemo(() => searchIndex(index, searchText), [index, searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && matches.length > 0}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search all my libraries..."
      searchBarAccessory={libraryPicker}
    >
      <List.EmptyView
        icon={errorMessage ? Icon.Warning : Icon.MagnifyingGlass}
        title={errorMessage ? "Could Not Load Documentation" : getEmptyTitle(searchText, snippets.length)}
        description={errorMessage ?? getEmptyDescription(searchText, snippets.length, uncached.length)}
      />

      {matches.length > 0 && (
        <List.Section
          title="My Libraries"
          subtitle={matches.length >= MAX_LOCAL_MATCHES ? `${MAX_LOCAL_MATCHES}+` : matches.length.toString()}
        >
          {matches.map((snippet: ScopedSnippet, rowIndex: number) => (
            <SnippetRow
              key={`${snippetKey(snippet, snippet.libraryId)}-${rowIndex}`}
              snippet={snippet}
              library={{ id: snippet.libraryId, name: snippet.libraryName }}
              isSaved={savedKeys.has(snippetKey(snippet, snippet.libraryId))}
              onSavedChange={refreshSavedKeys}
              isShowingDetail={isShowingDetail}
              onToggleDetail={() => setIsShowingDetail((showing) => !showing)}
              showLibraryTag
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function getEmptyTitle(searchText: string, total: number) {
  if (total === 0) {
    return "No Documentation Cached Yet";
  }

  return searchText.trim() ? "No Matching Snippets" : "Search All My Libraries";
}

function getEmptyDescription(searchText: string, total: number, uncachedCount: number) {
  if (total === 0) {
    return "Open a library once, or run Refresh All in My Libraries, to make it searchable here.";
  }

  if (!searchText.trim()) {
    return uncachedCount > 0
      ? `${countOf(uncachedCount, "library")} ${uncachedCount === 1 ? "has" : "have"} no cached documentation yet — refresh in My Libraries.`
      : "Type to filter every snippet across your libraries.";
  }

  return "Narrow to a single library in the dropdown to run Context7's semantic search instead.";
}

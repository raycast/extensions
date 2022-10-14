import { List, showToast, Toast } from "@raycast/api";
import { sortBy } from "lodash-es";
import { useCallback, useEffect, useState } from "react";
import { getPreferredLanguage, getPreferredVersion } from "./preferences";
import ReferenceActions from "./reference-actions";
import {
  BibleBook,
  BibleBookId,
  BibleBookMetadata,
  BibleData,
  BibleReference,
  BibleVersion,
  BibleVersionId,
} from "./types";
import {
  buildBibleReference,
  getBibleBookMetadata,
  getBibleData,
  normalizeSearchText as coreNormalizeSearchText,
} from "./utilities";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Type the name of a chapter, verse, or range or verses..."
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult: BibleReference) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: BibleReference }) {
  return (
    <List.Item
      title={`${searchResult.name} (${searchResult.version.name})`}
      actions={<ReferenceActions searchResult={searchResult} />}
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await getSearchResults(searchText);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    state: state,
    search: search,
  };
}

// Normalize the search text by removing extraneous characters and collapsing
// whitespace
function normalizeSearchText(searchText: string): string {
  searchText = coreNormalizeSearchText(searchText);
  searchText = searchText.replace(/(\d)(?=[a-z])/gi, "$1 ");
  searchText = searchText.replace(/\s+/g, " ");
  searchText = searchText.trim();
  return searchText;
}

function getReferenceMatches(searchText: string): (string | undefined)[] | null {
  const bookRegex = /(\d?(?:[^\W\d_]|\s)+|\d)\s?/;
  const chapterRegex = /(\d+)\s?/;
  const verseRegex = /(\d+)\s?/;
  const endVerseRegex = /(\d+)?\s?/;
  const versionRegex = /([^\W\d_](?:[^\W\d_]\d*|\s)*)?.*?/;
  return searchText.match(
    new RegExp(
      `^${bookRegex.source}(?:${chapterRegex.source}(?:${verseRegex.source}${endVerseRegex.source})?${versionRegex.source})?$`,
      "i"
    )
  );
}

// Parse out the search text into its parts (which we are calling 'parameters')
function getSearchParams(searchText: string): SearchParams | null {
  const referenceMatch = getReferenceMatches(searchText);
  if (!referenceMatch) {
    return null;
  }

  const bookMatch = referenceMatch[1]?.trimEnd();
  const chapterMatch = referenceMatch[2];
  const verseMatch = referenceMatch[3];
  const endVerseMatch = referenceMatch[4];
  const versionMatch = referenceMatch[5];

  return {
    book: bookMatch || "",
    chapter: chapterMatch ? Math.max(1, parseInt(chapterMatch, 10)) : 1,
    verse: verseMatch ? Math.max(1, parseInt(verseMatch, 10)) : null,
    endVerse: endVerseMatch ? parseInt(endVerseMatch, 10) : null,
    version: versionMatch ? normalizeSearchText(versionMatch) : null,
  };
}

// Finds a version which best matches the given version query
function guessVersion(versions: BibleVersion[], versionSearchText: string): BibleVersion | null {
  // Chop off character from version query until matching version can be found
  // (if a matching version even exists)
  for (let i = versionSearchText.length; i >= 0; i -= 1) {
    for (const version of versions) {
      const normalizedVersionName = normalizeSearchText(version.name);
      if (normalizedVersionName === versionSearchText.slice(0, i)) {
        return version;
      }
    }
  }
  // Give partial matches lower precedence over exact matches
  for (let i = versionSearchText.length; i >= 0; i -= 1) {
    for (const version of versions) {
      const normalizedVersionName = normalizeSearchText(version.name);
      if (normalizedVersionName.startsWith(versionSearchText.slice(0, i))) {
        return version;
      }
    }
  }
  return null;
}

function chooseBestVersion(
  preferredVersionId: BibleVersionId,
  bible: BibleData,
  searchParams: SearchParams
): BibleVersion {
  if (searchParams.version) {
    return guessVersion(bible.versions, searchParams.version) || bible.versions[0];
  } else if (preferredVersionId) {
    return bible.versions.find((version) => version.id === preferredVersionId) || bible.versions[0];
  }
  return bible.versions[0];
}

function splitBookNameIntoParts(bookName: string) {
  const bookWords = normalizeSearchText(bookName).split(" ");
  return bookWords.map((_word, w) => bookWords.slice(w).join(" "));
}

async function getMatchingBooks(allBooks: BibleBook[], searchParams: SearchParams) {
  const matchingBooks: BibleBookMatch[] = [];
  const bookMetadata = await getBibleBookMetadata();

  allBooks.forEach((book, b) => {
    const bookNameWords = splitBookNameIntoParts(book.name);
    const w = bookNameWords.findIndex((bookNameWord) => {
      return bookNameWord.startsWith(searchParams.book);
    });
    if (w !== -1) {
      matchingBooks.push({
        ...book,
        // Give more priority to book names that are matched sooner
        // (e.g. if the query matched the first word of a book name,
        // as opposed to the second or third word)
        priority: (w + 1) * 100 + b,
        // Store the metadata for the respective book (e.g. chapter
        // count) on this matching book object for convenience
        metadata: bookMetadata[book.id],
      });
    }
  });
  return sortBy(matchingBooks, (book) => book.priority);
}

function getSearchResult(book: BibleBookMatch, searchParams: SearchParams, chosenVersion: BibleVersion) {
  const chapter = Math.min(searchParams.chapter, book.metadata.chapters);
  const lastVerse = book.metadata.verses[chapter - 1];

  return buildBibleReference({
    book: book,
    chapter,
    verse: searchParams.verse ? Math.min(searchParams.verse, lastVerse) : null,
    endVerse: searchParams.endVerse ? Math.min(searchParams.endVerse, lastVerse) : null,
    version: chosenVersion,
  });
}

async function getSearchResults(searchText: string): Promise<BibleReference[]> {
  searchText = normalizeSearchText(searchText);
  const searchParams = getSearchParams(searchText);
  if (!searchParams) {
    return [];
  }
  const bible = await getBibleData(await getPreferredLanguage());

  const chosenVersion = chooseBestVersion(await getPreferredVersion(), bible, searchParams);

  return (await getMatchingBooks(bible.books, searchParams)).map((bibleBook) => {
    return getSearchResult(bibleBook, searchParams, chosenVersion);
  });
}

interface BibleBookMatch extends BibleBook {
  priority: number;
  metadata: BibleBookMetadata;
}

interface SearchState {
  results: BibleReference[];
  isLoading: boolean;
}
interface SearchParams {
  book: BibleBookId;
  chapter: number;
  verse: number | null;
  endVerse: number | null;
  version: string | null;
}

import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  type Image,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { BIBLE_BOOKS_DE, type BibleBook } from "./bible-books";
import {
  findBibleReferenceBooks,
  findPublicationCandidates,
  isBibleReference,
  normalizeText,
  parseBibleReference,
} from "./search";
import {
  buildChapterResults,
  buildPublicationItems,
  type ChapterSearchOptions,
  type Publication,
} from "./publications";
import { bookmarkDestination } from "./bookmarks";
import { readSnapshotPage } from "./pagination";
import { clearLibraryCache, isCancellation, loadLibrary, queryBookmarks, queryChapters, type Library } from "./library";

type ResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: Image.ImageLike;
  url?: string;
  copyText?: string;
  chapterSearch?: string;
  searchText?: string;
  backSearch?: string;
};

const TARGET_SEARCH_FOLDERS: Array<{ name: string; classes?: number[] }> = [
  { name: "rsg19_X" },
  { name: "nwtstg_X" },
  { name: "it_X" },
  { name: "nwtsty_X", classes: [11, 12, 14, 122] },
];
const MEETINGS_ALIASES = new Set(["m", "meeting", "meetings"]);
const PAGE_SIZE = 100;

async function openInJWLibrary(url: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    await showFailureToast(error, {
      title: "Could not open JW Library",
      message: "Make sure JW Library is installed, then try again.",
    });
  }
}

function toBibleItem(query: string): ResultItem[] {
  const parsed = parseBibleReference(query);
  if (!parsed) {
    const matches = findBibleReferenceBooks(query);
    return [
      {
        id: "invalid",
        title: matches.length > 1 ? `Ambiguous Bible book: ${query}` : `Invalid Bible reference: ${query}`,
        subtitle:
          matches.length > 1
            ? `Use the full name: ${matches.map((book) => book.longName).join(" or ")}`
            : "Check the chapter and verse numbers. Examples: 1Mo 1:1 or Römer 8:28.",
        icon: Icon.ExclamationMark,
      },
    ];
  }

  const book = String(parsed.book.id).padStart(2, "0");
  const chapter = String(parsed.chapter).padStart(3, "0");
  const verse = String(parsed.verseStart).padStart(3, "0");
  const endVerse = parsed.verseEnd === null ? "" : `-${book}${chapter}${String(parsed.verseEnd).padStart(3, "0")}`;
  const url = `jwlibrary:///finder?bible=${book}${chapter}${verse}${endVerse}`;
  const display = `${parsed.book.longName} ${parsed.chapter}:${parsed.verseStart}${parsed.verseEnd ? `-${parsed.verseEnd}` : ""}`;
  return [{ id: `bible-${query}`, title: `Open ${display}`, subtitle: url, url, icon: Icon.Book }];
}

function getMeetingsItem(): ResultItem {
  const today = new Date();
  const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const labelDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  const url = `jwlibrary:///finder?srcid=jwlshare&wtlocale=X&prefer=lang&alias=meetings&date=${date}`;
  return { id: "meetings", title: `Open Meetings (${labelDate})`, subtitle: url, url, icon: Icon.Calendar };
}

function findMatchingBibleBooks(query: string): BibleBook[] {
  if (!query) {
    return BIBLE_BOOKS_DE;
  }
  const normalized = normalizeText(query);
  return BIBLE_BOOKS_DE.filter(
    (book) =>
      normalizeText(book.longName).includes(normalized) ||
      book.aliases.some((alias) => normalizeText(alias).includes(normalized)),
  );
}

function findMatchingPublications(query: string, publications: Publication[]): Publication[] {
  if (!query) {
    return publications;
  }
  const normalized = normalizeText(query);
  return publications
    .filter((pub) => {
      const bySymbol = normalizeText(pub.symbol).includes(normalized);
      const byFolder = normalizeText(pub.folderName).startsWith(normalized);
      const byName = normalizeText(pub.name).includes(normalized);
      return bySymbol || byFolder || byName;
    })
    .sort((a, b) => {
      const aDirect = normalizeText(a.symbol) === normalized ? -1 : 0;
      const bDirect = normalizeText(b.symbol) === normalized ? -1 : 0;
      return aDirect - bDirect;
    });
}

function buildGeneralSearch(query: string, publications: Publication[]): ResultItem[] {
  const items: ResultItem[] =
    !query || "bookmarks".includes(normalizeText(query))
      ? [
          {
            id: "bookmark-shortcut",
            title: "Search Bookmarks",
            subtitle: "Type 'b' or 'b <search term>'",
            icon: Icon.Bookmark,
            searchText: "b ",
            copyText: "b ",
          },
        ]
      : [];

  if (MEETINGS_ALIASES.has(normalizeText(query))) {
    items.push(getMeetingsItem());
  }

  const books = findMatchingBibleBooks(query).map((book) => ({
    id: `book-${book.id}`,
    title: book.longName,
    subtitle: `Bible book (${book.shortName})`,
    icon: Icon.Book,
    searchText: `${book.longName} `,
    copyText: `${book.longName} `,
  }));

  const pubs = buildPublicationItems(findMatchingPublications(query, publications)).map((item) => ({
    ...item,
    icon: item.icon ?? Icon.Document,
  }));

  return [...items, ...books, ...pubs];
}

async function chapterItems(
  publication: Publication,
  library: Library,
  filter: string,
  signal: AbortSignal,
  options: ChapterSearchOptions & { includeEmptyMessage?: boolean } = {},
): Promise<ResultItem[]> {
  if (!library.publicationsPath) return [];
  const chapters = await queryChapters(library.publicationsPath, publication, signal);
  const items = buildChapterResults(publication, chapters, filter, options).map((item) => ({
    ...item,
    icon: item.icon ?? Icon.Document,
    backSearch: publication.symbol,
  }));
  if (!items.length && options.includeEmptyMessage !== false)
    return [
      {
        id: "chapters-empty",
        title: "No matching chapters",
        subtitle: "Use a chapter number or title, or clear the filter to browse all documents.",
        icon: Icon.ExclamationMark,
        searchText: `${publication.folderName} `,
      },
    ];
  return items;
}

async function buildResults(query: string, library: Library | null, signal: AbortSignal): Promise<ResultItem[]> {
  if (isBibleReference(query)) return toBibleItem(query);
  if (MEETINGS_ALIASES.has(normalizeText(query))) return [getMeetingsItem()];
  if (/^(v|version)$/i.test(query))
    return [
      {
        id: "version",
        title: "JW Library Linker",
        subtitle: "German Bible references, publications, chapters, meetings, and text bookmarks",
        icon: Icon.Info,
      },
    ];
  if (!library) return [];
  if (/^b(?:\s|$)/i.test(query)) {
    if (!library.bookmarksDbPath)
      return [
        {
          id: "bookmarks-missing",
          title: "Bookmark database not found",
          subtitle: "Open JW Library, create a bookmark, then refresh. Check the container preference if needed.",
          icon: Icon.ExclamationMark,
        },
      ];
    const term = normalizeText(query.slice(1));
    const rows = await queryBookmarks(library.bookmarksDbPath, signal);
    const colors = [
      Color.Red,
      Color.Orange,
      Color.Yellow,
      Color.Green,
      Color.Blue,
      Color.Purple,
      Color.Magenta,
      Color.PrimaryText,
    ];
    const items: ResultItem[] = rows
      .filter((row) => !term || normalizeText(row.title ?? "").includes(term))
      .map((bookmark) => {
        const destination = bookmarkDestination(bookmark, library.publications, library.languages);
        return {
          id: `bookmark-${bookmark.bookmarkId}`,
          title: bookmark.title || "Untitled bookmark",
          subtitle: destination.reason ?? destination.publication?.name ?? "JW Library bookmark",
          icon: destination.reason
            ? Icon.ExclamationMark
            : { source: Icon.Bookmark, tintColor: colors[Math.abs(bookmark.slot) % colors.length] },
          url: destination.url,
        };
      });
    return items.length
      ? items
      : [
          {
            id: "bookmarks-empty",
            title: "No matching bookmarks",
            subtitle: "Clear the search after 'b' to browse all bookmarks, or refresh after creating one.",
            icon: Icon.Bookmark,
          },
        ];
  }
  if (!library.publicationsPath)
    return [
      {
        id: "missing-publications",
        title: "No local publications found",
        subtitle: "Download a publication in JW Library, then refresh. Bible and meeting links remain available.",
        icon: Icon.ExclamationMark,
      },
      ...buildGeneralSearch(query, library.publications),
    ];
  if (/^s(?:\s|$)/i.test(query)) {
    const term = query.slice(1).trim();
    if (!term) return buildGeneralSearch("", library.publications);
    const groups = await Promise.all(
      TARGET_SEARCH_FOLDERS.map(async (target) => {
        const publication = library.publications.find((pub) => pub.folderName === target.name);
        return publication
          ? chapterItems(publication, library, term, signal, {
              classes: target.classes,
              includeEmptyMessage: false,
              matchChapterNumbers: false,
            })
          : [];
      }),
    );
    const items = groups.flat();
    return items.length
      ? items
      : [
          {
            id: "index-empty",
            title: "No matching index titles",
            subtitle: "Try another title keyword or download the supported German index publications.",
            icon: Icon.ExclamationMark,
          },
        ];
  }
  const match = findPublicationCandidates(query, library.publications);
  if (match.publications.length === 1) return chapterItems(match.publications[0], library, match.filter, signal);
  if (match.publications.length > 1)
    return match.publications.map((publication) => ({
      id: `choose-${publication.folderName}`,
      title: publication.name,
      subtitle: `Choose ${publication.folderName} for '${match.filter}'`,
      icon: publication.icon ?? Icon.Document,
      searchText: `${publication.folderName} ${match.filter}`,
    }));
  return buildGeneralSearch(query, library.publications);
}

function errorItem(error: unknown): ResultItem {
  return {
    id: "data-error",
    title: "Could not read JW Library data",
    subtitle: error instanceof Error ? error.message : "Refresh and try again.",
    icon: Icon.ExclamationMark,
  };
}

class ResultsError extends Error {
  constructor(
    readonly query: string,
    readonly revision: number,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : "Refresh and try again.", { cause });
  }
}

export default function Command() {
  const { containerUuid } = getPreferenceValues<Preferences.JwLibraryLinker>();
  const [searchText, setSearchText] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const libraryAbortable = useRef<AbortController | null>(null);
  const resultsAbortable = useRef<AbortController | null>(null);
  const {
    data: library,
    isLoading: initialLoading,
    error: initialError,
  } = usePromise(
    async ({ uuid }: { uuid?: string; revision: number }) => loadLibrary(uuid, libraryAbortable.current?.signal),
    [{ uuid: containerUuid, revision: refreshVersion }],
    { abortable: libraryAbortable, failureToastOptions: { title: "Could not read JW Library data" } },
  );
  const query = searchText.trim();
  const independent =
    isBibleReference(query) || MEETINGS_ALIASES.has(normalizeText(query)) || /^(v|version)$/i.test(query);
  const {
    data: results,
    isLoading: resultsLoading,
    error: resultsError,
    pagination,
  } = usePromise(
    (input: { query: string; library: Library | null; failure?: string; revision: number; independent: boolean }) =>
      async ({ page, cursor }: { page: number; cursor?: readonly ResultItem[] }) => {
        const signal = resultsAbortable.current!.signal;
        signal.throwIfAborted();
        try {
          const result = await readSnapshotPage(
            page,
            cursor,
            async () => {
              const items =
                input.failure && !input.independent
                  ? [errorItem(new Error(input.failure)), ...buildGeneralSearch(input.query, [])]
                  : await buildResults(input.query, input.library, signal);
              const warnings: ResultItem[] =
                input.independent || input.query
                  ? []
                  : (input.library?.warnings ?? []).map((warning, index) => ({
                      id: `warning-${index}`,
                      title: "Some publications could not be loaded",
                      subtitle: warning,
                      icon: Icon.ExclamationMark,
                    }));
              return [...items, ...warnings];
            },
            PAGE_SIZE,
          );
          signal.throwIfAborted();
          const pageItems: Array<ResultItem | null> = result.data;
          // Keep the query identity even for an empty page so a new query shows
          // a loading state rather than briefly flashing "No matching results".
          if (pageItems.length === 0) pageItems.push(null);
          return {
            ...result,
            data: pageItems.map((item) => ({
              query: input.query,
              revision: input.revision,
              item,
            })),
          };
        } catch (error) {
          if (isCancellation(error)) throw error;
          throw new ResultsError(input.query, input.revision, error);
        }
      },
    [{ query, library: library ?? null, failure: initialError?.message, revision: refreshVersion, independent }],
    {
      abortable: resultsAbortable,
      execute: independent || !initialLoading,
      failureToastOptions: { title: "Could not read JW Library data" },
    },
  );

  function refresh() {
    clearLibraryCache();
    setRefreshVersion((version) => version + 1);
  }

  const currentResults = (results ?? []).filter((row) => row.query === query && row.revision === refreshVersion);
  const currentError =
    resultsError instanceof ResultsError && resultsError.query === query && resultsError.revision === refreshVersion
      ? resultsError
      : undefined;
  const loading = resultsLoading || (!independent && initialLoading) || (!currentResults.length && !currentError);
  const items =
    currentError && !loading
      ? [errorItem(currentError)]
      : currentResults.flatMap((row) => (row.item ? [row.item] : []));
  const refreshAction = (
    <Action
      title="Refresh Library"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refresh}
    />
  );
  const preferencesAction = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Bible, publications, or chapters (rr 3)"
      throttle
      pagination={pagination}
    >
      <List.EmptyView
        title={loading ? "Loading JW Library" : "No matching results"}
        description={
          loading
            ? "Reading local publication metadata."
            : library?.warnings.length
              ? "No titles match. Some downloads are incomplete; refresh after they finish, or try another search."
              : "Try a Bible reference, publication title, 'b' for bookmarks, or 'm' for meetings."
        }
        actions={
          <ActionPanel>
            {refreshAction}
            {preferencesAction}
          </ActionPanel>
        }
      />
      {items.map((item) => {
        const { url, chapterSearch, searchText: fill, backSearch } = item;
        return (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            actions={
              <ActionPanel>
                {url ? (
                  <Action title="Open in JW Library" icon={Icon.Book} onAction={() => openInJWLibrary(url)} />
                ) : null}
                {fill ? (
                  <Action title="Use in Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(fill)} />
                ) : null}
                {chapterSearch ? (
                  <Action title="Browse Chapters" icon={Icon.List} onAction={() => setSearchText(chapterSearch)} />
                ) : null}
                {backSearch ? (
                  <Action
                    title="Back to Publications"
                    icon={Icon.ArrowLeft}
                    onAction={() => setSearchText(backSearch)}
                  />
                ) : null}
                {item.copyText && item.copyText !== url ? (
                  <Action.CopyToClipboard title="Copy Text" content={item.copyText} />
                ) : null}
                {url ? <Action.CopyToClipboard title="Copy Link" content={url} /> : null}
                {refreshAction}
                {preferencesAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

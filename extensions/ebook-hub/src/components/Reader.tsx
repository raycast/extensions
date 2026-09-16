import { Action, ActionPanel, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  PROGRESS_SCHEMA_VERSION,
  START_POSITION,
  type BookManifest,
  type Bookmark,
  type ReadingPosition,
  type ReadingProgress,
} from "../domain/book";
import { pageIndexForBlock, pageMarkdown, paginateChapter, type PaginatedChapter } from "../domain/pagination";
import { clampPosition, computePercent, findBookmarkOnPage, sortBookmarks } from "../domain/progress";
import {
  PAGE_JUMP,
  changeChapter,
  movePages,
  nextPage,
  previousPage,
  recordJump,
  type NavigationResult,
  type ReaderLocation,
} from "../domain/reader-navigation";
import { markdownToPlainText, truncate } from "../domain/text";
import { READER_KEYS } from "../keymap";
import { readPreferences } from "../preferences";
import { getLibraryStore, rememberLastOpened } from "../storage";
import { LibraryError, type LibraryStore } from "../storage/library-store";
import { CommandMode } from "./CommandMode";
import { ApplyHueThemeSubmenu } from "./ThemeActions";

const EXCERPT_LENGTH = 80;

type BookmarksUpdate = (update: (current: Bookmark[]) => Bookmark[]) => void;

interface LoadedBook {
  book: BookManifest;
  progress: ReadingProgress | null;
}

async function loadBook(store: LibraryStore, bookId: string): Promise<LoadedBook> {
  const book = await store.get(bookId);
  let progress: ReadingProgress | null = null;
  try {
    progress = await store.readProgress(bookId);
  } catch (error) {
    if (!(error instanceof LibraryError && error.code === "invalid")) {
      throw error;
    }
    await showToast({ style: Toast.Style.Failure, title: "Starting from the beginning", message: error.message });
  }
  await rememberLastOpened(bookId);
  return { book, progress };
}

export function Reader({ bookId }: { bookId: string }) {
  const store = useMemo(getLibraryStore, []);
  const { data, error } = usePromise(loadBook, [store, bookId]);

  if (error) {
    return <Detail markdown={`# Could not open book\n\n${error.message}`} />;
  }
  if (!data) {
    return <Detail isLoading markdown="" />;
  }
  return <ReaderView store={store} book={data.book} initialProgress={data.progress} />;
}

interface ReaderViewProps {
  store: LibraryStore;
  book: BookManifest;
  initialProgress: ReadingProgress | null;
}

/** Owns reading state and loads one chapter at a time. See ADR-0002. */
function ReaderView({ store, book, initialProgress }: ReaderViewProps) {
  const preferences = useMemo(readPreferences, []);
  const [position, setPosition] = useState<ReadingPosition>(() =>
    clampPosition(book, initialProgress?.position ?? START_POSITION),
  );
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialProgress?.bookmarks ?? []);
  const jumps = useRef<ReadingPosition[]>([]);

  const { data: loaded, error } = usePromise(
    async (chapterIndex: number) => ({ chapterIndex, markdown: await store.readChapter(book, chapterIndex) }),
    [position.chapterIndex],
  );
  const chapter = useMemo(
    () =>
      loaded?.chapterIndex === position.chapterIndex
        ? paginateChapter(loaded.markdown, preferences.wordsPerPage)
        : null,
    [loaded, position.chapterIndex, preferences.wordsPerPage],
  );

  function move(next: ReadingPosition, jumpFrom: ReadingPosition | null) {
    if (jumpFrom) {
      jumps.current = recordJump(jumps.current, jumpFrom);
    }
    setPosition(clampPosition(book, next));
  }

  function jumpBack() {
    const previous = jumps.current.pop();
    if (!previous) {
      void showToast({ style: Toast.Style.Failure, title: "No earlier position" });
      return;
    }
    setPosition(clampPosition(book, previous));
  }

  if (error) {
    return <Detail navigationTitle={book.title} markdown={`# Could not load chapter\n\n${error.message}`} />;
  }
  if (!chapter) {
    return <Detail isLoading navigationTitle={book.title} markdown="" />;
  }
  return (
    <ReaderPage
      store={store}
      book={book}
      chapter={chapter}
      position={position}
      bookmarks={bookmarks}
      focusMode={preferences.focusMode}
      onMove={move}
      onJumpBack={jumpBack}
      onBookmarksChange={setBookmarks}
    />
  );
}

interface ReaderPageProps {
  store: LibraryStore;
  book: BookManifest;
  chapter: PaginatedChapter;
  position: ReadingPosition;
  bookmarks: Bookmark[];
  focusMode: boolean;
  onMove: (next: ReadingPosition, jumpFrom: ReadingPosition | null) => void;
  onJumpBack: () => void;
  onBookmarksChange: BookmarksUpdate;
}

function ReaderPage({ store, book, chapter, position, bookmarks, focusMode, ...handlers }: ReaderPageProps) {
  const { push } = useNavigation();
  const { chapterIndex } = position;
  const pageIndex = pageIndexForBlock(chapter.pages, position.blockIndex);
  const page = chapter.pages[pageIndex];
  const pageStart = page.startBlock;
  const current: ReadingPosition = { chapterIndex, blockIndex: pageStart };
  const percent = computePercent(book.chapters, book.totalWords, chapterIndex, chapter.pages, pageIndex);
  const location: ReaderLocation = {
    chapterCount: book.chapters.length,
    chapterIndex,
    pages: chapter.pages,
    pageIndex,
  };
  const bookmark = findBookmarkOnPage(bookmarks, chapterIndex, page);

  useEffect(() => {
    const progress: ReadingProgress = {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      position: { chapterIndex, blockIndex: pageStart },
      percent,
      bookmarks,
      updatedAt: new Date().toISOString(),
    };
    store.writeProgress(book.id, progress).catch((writeError: unknown) => {
      void showFailureToast(writeError, { title: "Could not save reading progress" });
    });
  }, [store, book.id, chapterIndex, pageStart, percent, bookmarks]);

  function run(result: NavigationResult) {
    if (result.kind === "move") {
      handlers.onMove(result.position, result.recordJump ? current : null);
      return;
    }
    void showToast({ style: result.reachedEnd ? Toast.Style.Success : Toast.Style.Failure, title: result.message });
  }

  function toggleBookmark() {
    if (bookmark) {
      handlers.onBookmarksChange((items) => items.filter((item) => item !== bookmark));
      void showToast({ style: Toast.Style.Success, title: "Bookmark removed" });
      return;
    }
    const added: Bookmark = {
      ...current,
      excerpt: truncate(markdownToPlainText(pageMarkdown(chapter, page)), EXCERPT_LENGTH),
      createdAt: new Date().toISOString(),
    };
    handlers.onBookmarksChange((items) => sortBookmarks([...items, added]));
    void showToast({ style: Toast.Style.Success, title: "Bookmark added" });
  }

  function openCommandMode(initialText: string) {
    push(
      <CommandMode
        book={book}
        position={current}
        currentPages={chapter.pages}
        bookmarks={bookmarks}
        initialText={initialText}
        onJump={(target) => handlers.onMove(target, current)}
        onDeleteBookmark={(target) => handlers.onBookmarksChange((items) => items.filter((item) => item !== target))}
      />,
    );
  }

  const navigationTitle = focusMode
    ? book.title
    : `${book.title} · ${book.chapters[chapterIndex].title} · ${pageIndex + 1}/${chapter.pages.length} · ${percent}%`;

  return (
    <Detail
      markdown={pageMarkdown(chapter, page) || "_This chapter is empty._"}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Page">
            <Action
              title="Next Page"
              icon={Icon.ArrowDown}
              shortcut={READER_KEYS.nextPage}
              onAction={() => run(nextPage(location))}
            />
            <Action
              title="Previous Page"
              icon={Icon.ArrowUp}
              shortcut={READER_KEYS.previousPage}
              onAction={() => run(previousPage(location))}
            />
            <Action
              title={`Forward ${PAGE_JUMP} Pages`}
              icon={Icon.ChevronDownSmall}
              shortcut={READER_KEYS.forwardPages}
              onAction={() => run(movePages(location, PAGE_JUMP))}
            />
            <Action
              title={`Back ${PAGE_JUMP} Pages`}
              icon={Icon.ChevronUpSmall}
              shortcut={READER_KEYS.backPages}
              onAction={() => run(movePages(location, -PAGE_JUMP))}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Chapter">
            <Action
              title="Next Chapter"
              icon={Icon.ArrowRight}
              shortcut={READER_KEYS.nextChapter}
              onAction={() => run(changeChapter(location, 1))}
            />
            <Action
              title="Previous Chapter"
              icon={Icon.ArrowLeft}
              shortcut={READER_KEYS.previousChapter}
              onAction={() => run(changeChapter(location, -1))}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigate">
            <Action
              title="Command Mode"
              icon={Icon.Terminal}
              shortcut={READER_KEYS.commandMode}
              onAction={() => openCommandMode("")}
            />
            <Action
              title="Search in Book"
              icon={Icon.MagnifyingGlass}
              shortcut={READER_KEYS.search}
              onAction={() => openCommandMode("/")}
            />
            <Action title="Jump Back" icon={Icon.Undo} shortcut={READER_KEYS.jumpBack} onAction={handlers.onJumpBack} />
            <Action
              title={bookmark ? "Remove Bookmark" : "Add Bookmark"}
              icon={bookmark ? Icon.XMarkCircle : Icon.Bookmark}
              shortcut={READER_KEYS.toggleBookmark}
              onAction={toggleBookmark}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ApplyHueThemeSubmenu />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

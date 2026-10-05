import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import type { BookManifest, Bookmark, ReadingPosition } from "../domain/book";
import { COMMAND_HELP, parseCommand } from "../domain/command";
import type { Page } from "../domain/pagination";
import { formatReadingTime } from "../domain/progress";
import { MIN_QUERY_LENGTH, buildSearchIndex, searchBook } from "../domain/search";
import { matchesQuery, normalizeForSearch } from "../domain/text";
import { readPreferences } from "../preferences";
import { getLibraryStore } from "../storage";
import { hueColor } from "../theme/colors";
import { HUE_MOOD_LIST } from "../theme/hue-tokens";
import { applyHueTheme, moodIcon } from "./ThemeActions";

interface CommandModeProps {
  book: BookManifest;
  position: ReadingPosition;
  currentPages: readonly Page[];
  bookmarks: readonly Bookmark[];
  initialText: string;
  onJump: (position: ReadingPosition) => void;
  onDeleteBookmark: (bookmark: Bookmark) => void;
}

export function CommandMode(props: CommandModeProps) {
  const { book, position, currentPages } = props;
  const { pop } = useNavigation();
  const preferences = useMemo(readPreferences, []);
  const store = useMemo(getLibraryStore, []);
  const [text, setText] = useState(props.initialText);
  const [bookmarks, setBookmarks] = useState<readonly Bookmark[]>(props.bookmarks);

  const command = parseCommand(text);
  const searchQuery = command.kind === "search" ? command.query : "";
  const needsChapters = command.kind === "search" && normalizeForSearch(searchQuery).length >= MIN_QUERY_LENGTH;

  const { data: searchIndex, isLoading } = usePromise(
    async (target: BookManifest) =>
      buildSearchIndex(await Promise.all(target.chapters.map((_, index) => store.readChapter(target, index)))),
    [book],
    { execute: needsChapters },
  );
  const hits = useMemo(
    () => (searchIndex && searchQuery ? searchBook(searchIndex, searchQuery) : []),
    [searchIndex, searchQuery],
  );

  const accent = hueColor(preferences.mood, "accent.primary");
  const chapterTitle = (index: number) => `${index + 1}. ${book.chapters[index]?.title ?? "Unknown chapter"}`;

  function jump(target: ReadingPosition) {
    // Search hits and bookmarks carry extra fields; the reader only needs the position.
    props.onJump({ chapterIndex: target.chapterIndex, blockIndex: target.blockIndex });
    pop();
  }

  function jumpAction(target: ReadingPosition, title: string) {
    return <Action title={title} icon={Icon.ArrowRight} onAction={() => jump(target)} />;
  }

  function renderItems() {
    switch (command.kind) {
      case "toc":
        return (
          <List.Section title="Table of Contents" subtitle={`${book.chapters.length} chapters`}>
            {book.chapters.map((chapter, index) =>
              matchesQuery(chapter.title, command.filter) ? (
                <List.Item
                  key={chapter.file}
                  title={chapterTitle(index)}
                  icon={index === position.chapterIndex ? { source: Icon.Dot, tintColor: accent } : Icon.Document}
                  accessories={[{ text: formatReadingTime(chapter.words) }]}
                  actions={
                    <ActionPanel>{jumpAction({ chapterIndex: index, blockIndex: 0 }, "Go to Chapter")}</ActionPanel>
                  }
                />
              ) : null,
            )}
          </List.Section>
        );

      case "page": {
        const page = currentPages[command.page - 1];
        return page ? (
          <List.Item
            title={`Go to Page ${command.page}`}
            subtitle={chapterTitle(position.chapterIndex)}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                {jumpAction({ chapterIndex: position.chapterIndex, blockIndex: page.startBlock }, "Go to Page")}
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="Page out of range"
            description={`This chapter has pages 1–${currentPages.length}.`}
          />
        );
      }

      case "chapter": {
        const index = command.chapter - 1;
        return book.chapters[index] ? (
          <List.Item
            title={`Go to ${chapterTitle(index)}`}
            icon={Icon.Book}
            actions={<ActionPanel>{jumpAction({ chapterIndex: index, blockIndex: 0 }, "Go to Chapter")}</ActionPanel>}
          />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="Chapter out of range"
            description={`This book has chapters 1–${book.chapters.length}.`}
          />
        );
      }

      case "bookmarks":
        return (
          <>
            <List.EmptyView icon={Icon.Bookmark} title="No bookmarks" description="Press ⌃M while reading." />
            {bookmarks.map((bookmark) => (
              <List.Item
                key={`${bookmark.chapterIndex}:${bookmark.blockIndex}`}
                title={bookmark.excerpt || "Bookmark"}
                subtitle={chapterTitle(bookmark.chapterIndex)}
                icon={{ source: Icon.Bookmark, tintColor: accent }}
                actions={
                  <ActionPanel>
                    {jumpAction(bookmark, "Go to Bookmark")}
                    <Action
                      title="Delete Bookmark"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => {
                        setBookmarks((current) => current.filter((item) => item !== bookmark));
                        props.onDeleteBookmark(bookmark);
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </>
        );

      case "theme": {
        const moods = HUE_MOOD_LIST.filter((mood) => command.name === null || mood.id.startsWith(command.name));
        return moods.length > 0 ? (
          moods.map((mood) => (
            <List.Item
              key={mood.id}
              title={`Apply ${mood.label}`}
              subtitle="Changes the theme of all of Raycast"
              icon={moodIcon(mood)}
              actions={
                <ActionPanel>
                  <Action title="Apply Theme" icon={Icon.Brush} onAction={() => applyHueTheme(mood)} />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.EmptyView icon={Icon.Brush} title="Unknown theme" description="Use mua, huong, or cung." />
        );
      }

      case "search":
        if (!needsChapters) {
          return (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title="Search this book"
              description={`Type at least ${MIN_QUERY_LENGTH} characters after /. Diacritics are ignored.`}
            />
          );
        }
        return (
          <>
            <List.EmptyView icon={Icon.MagnifyingGlass} title="No matches" />
            <List.Section title="Matches" subtitle={String(hits.length)}>
              {hits.map((hit) => (
                <List.Item
                  key={`${hit.chapterIndex}:${hit.blockIndex}`}
                  title={hit.excerpt}
                  accessories={[{ text: chapterTitle(hit.chapterIndex) }]}
                  actions={<ActionPanel>{jumpAction(hit, "Go to Match")}</ActionPanel>}
                />
              ))}
            </List.Section>
          </>
        );

      case "unknown":
        return <List.EmptyView icon={Icon.QuestionMark} title="Unknown command" description={COMMAND_HELP} />;
    }
  }

  return (
    <List
      filtering={false}
      throttle
      isLoading={needsChapters && isLoading}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder={COMMAND_HELP}
      navigationTitle={`${book.title} — Command Mode`}
    >
      {renderItems()}
    </List>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";

import { Clipboard, List, getPreferenceValues } from "@raycast/api";

import { BookItem } from "@/components/book-item";
import { EmptyView } from "@/components/empty-view";
import { searchBooksOnLibgen } from "@/hooks/search-books-on-libgen";
import { useBookCovers } from "@/hooks/use-book-covers";
import { type LibgenPreferences, SearchType } from "@/types";
import { MISSING_COVER, PENDING_COVER } from "@/utils/book-covers";
import { getBookRows } from "@/utils/book-rows";
import { isEmpty } from "@/utils/common";

export default function Command() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [searchType, setSearchType] = useState<SearchType>(SearchType.NonFiction);
  const { books, loading, error } = searchBooksOnLibgen(searchContent, searchType);
  const rows = useMemo(() => getBookRows(books), [books]);
  const covers = useBookCovers(books);
  const onSearchTypeChange = useCallback((type: string) => setSearchType(Number(type)), []);

  const copyFromClipboard = useCallback(async () => {
    // Get the clipboard content
    const text = await Clipboard.readText();
    setSearchContent(text?.trim() ?? "");
  }, []);

  useEffect(() => {
    // Read clipboard preferences
    const { copySearchContentFromClipboard } = getPreferenceValues<LibgenPreferences>();
    if (copySearchContentFromClipboard) {
      void copyFromClipboard();
    }
  }, [copyFromClipboard]);

  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (error) {
      return "Search Failed";
    }
    if (books.length === 0 && !isEmpty(searchContent)) {
      return "No Results";
    }
    return "Search Books on Library Genesis";
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search Books on Library Genesis"}
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      throttle={true}
      filtering={false}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Type" onChange={onSearchTypeChange} storeValue>
          <List.Dropdown.Item title="All" value="-1" />
          <List.Dropdown.Item title="Non-fiction" value="1" />
          <List.Dropdown.Item title="Fiction" value="0" />
        </List.Dropdown>
      }
    >
      <EmptyView title={emptyViewTitle()} description={error}></EmptyView>
      {rows.map(({ id, book }) => (
        <BookItem
          key={id}
          id={id}
          book={book}
          cover={book.coverUrl === "N/A" ? MISSING_COVER : (covers?.[book.coverUrl] ?? PENDING_COVER)}
        />
      ))}
    </List>
  );
}

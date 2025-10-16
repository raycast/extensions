import { useCallback, useEffect, useState } from "react";

import { Clipboard, List, getPreferenceValues } from "@raycast/api";

import { BookItem } from "@/components/book-item";
import { EmptyView } from "@/components/empty-view";
import { searchBooksOnLibgen } from "@/hooks/search-books-on-libgen";
import { type LibgenPreferences, SearchType } from "@/types";
import { isEmpty } from "@/utils/common";

export default function Command() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [searchType, setSearchType] = useState<SearchType>(SearchType.NonFiction);
  const { books, loading } = searchBooksOnLibgen(searchContent, searchType);

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
      isShowingDetail={books.length !== 0}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" onChange={(type) => setSearchType(Number(type))} storeValue>
          <List.Dropdown.Item title="All" value="-1" />
          <List.Dropdown.Item title="Non-fiction" value="1" />
          <List.Dropdown.Item title="Fiction" value="0" />
        </List.Dropdown>
      }
    >
      <EmptyView title={emptyViewTitle()}></EmptyView>
      {books.map((book, index) => (
        <BookItem key={index} book={book}></BookItem>
      ))}
    </List>
  );
}

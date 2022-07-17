import { List, Clipboard, getPreferenceValues } from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { EmptyView } from "./components/empty-view";
import { searchBooksOnLibgen } from "./hooks/searchBookOnLibgen";
import { isEmpty } from "./utils/common-utils";
import { BookItem } from "./components/book-item";
import { Preferences } from "./types";

export default function Command() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { books, loading } = searchBooksOnLibgen(searchContent);

  const copyFromClipboard = useCallback(async () => {
    // Get the clipboard content
    const text = await Clipboard.readText();
    setSearchContent(text?.trim() ?? "");
  }, []);

  useEffect(() => {
    // Read clipboard preferences
    const { copySearchContentFromClipboard } = getPreferenceValues<Preferences>();
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
    >
      <EmptyView title={emptyViewTitle()}></EmptyView>
      {books.map((book, index) => (
        <BookItem key={index} book={book}></BookItem>
      ))}
    </List>
  );
}

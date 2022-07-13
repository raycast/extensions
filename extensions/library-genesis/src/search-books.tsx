import { List } from "@raycast/api";
import { useState } from "react";
import { EmptyView } from "./components/empty-view";
import { searchBookOnLibgen } from "./hooks/hooks";
import { isEmpty } from "./utils/common-utils";
import { BookItem } from "./components/book-item";

export default function Command() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { books, loading } = searchBookOnLibgen(searchContent);

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
      isShowingDetail
    >
      <EmptyView title={emptyViewTitle()}></EmptyView>
      {books.map((book, index) => (
        <BookItem key={index} book={book}></BookItem>
      ))}
    </List>
  );
}

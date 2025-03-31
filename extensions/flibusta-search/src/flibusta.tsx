import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { OpdsBook, SearchStatus } from "./types";
import { BookListItem } from "./components/BookListItem";
import { searchBooks } from "./services/opdsService";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [books, setBooks] = useState<OpdsBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query]);

  async function performSearch() {
    if (query.length === 0) {
      setBooks([]);
      setSearchStatus("idle");
      return;
    }

    setIsLoading(true);
    setSearchStatus("searching");

    await showToast({
      style: Toast.Style.Animated,
      title: "Searching...",
      message: `Looking for "${query}"`,
    });

    try {
      const results = await searchBooks(query);
      setBooks(results);

      if (results.length > 0) {
        setSearchStatus("found");
        await showToast({
          style: Toast.Style.Success,
          title: "Found books",
          message: `Found ${results.length} books for "${query}"`,
        });
      } else {
        setSearchStatus("not_found");
        await showToast({
          style: Toast.Style.Failure,
          title: "No results",
          message: `No books found for "${query}"`,
        });
      }
    } catch (error) {
      setSearchStatus("not_found");
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to search books. Please try again." + error,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for books... (Press Enter to search)"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" onSubmit={() => setQuery(searchText)} />
        </ActionPanel>
      }
    >
      {searchStatus === "searching" && (
        <List.Item title="Searching..." subtitle={`Looking for "${query}"`} icon={Icon.CircleProgress} />
      )}
      {searchStatus === "not_found" && (
        <List.Item title="No results found" subtitle={`Try a different search term`} icon={Icon.ExclamationMark} />
      )}
      {books.map((book, index) => (
        <BookListItem key={index} book={book} />
      ))}
    </List>
  );
}

// src/show-all-books.tsx
import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getAllBooks, SearchResultItem, baseUrl } from "./bookstack-api";
import { stripHtmlTags } from "./utils";

export default function ShowAllBooks() {
  const [books, setBooks] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    getAllBooks()
      .then((bookData) => {
        setBooks(bookData);
        setIsLoading(false);
      })
      .catch((error) => {
        showToast(
          Toast.Style.Failure,
          "Failed to fetch data",
          error instanceof Error ? error.message : "An unknown error occurred",
        ).then((r) => console.log(r));
        setIsLoading(false);
      });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search books...">
      {books.map((book) => (
        <List.Item
          key={book.id.toString()}
          title={book.name}
          subtitle={stripHtmlTags(book.description)}
          accessories={[{ text: book.url }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${baseUrl}${book.url}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

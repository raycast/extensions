import { ActionPanel, Action, List, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getBooks, Book } from "./api"; // Assuming api.ts is in the same directory
import HighlightsDetail from "./HighlightsDetail"; // Import the new component
// We will create/import a HighlightsDetailView component later
// import HighlightsDetailView from "./highlightsDetailView";

export default function ViewBookHighlightsCommand() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchBooks() {
      setIsLoading(true);
      try {
        const fetchedBooks = await getBooks();
        setBooks(fetchedBooks);
        setError(null);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message || "Failed to fetch books");
          showToast({ style: Toast.Style.Failure, title: "Error Fetching Books", message: e.message });
        } else {
          setError("Failed to fetch books");
          showToast({
            style: Toast.Style.Failure,
            title: "Error Fetching Books",
            message: "An unknown error occurred",
          });
        }
      }
      setIsLoading(false);
    }
    fetchBooks();
  }, []);

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView title="Error Fetching Books" description={error} icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Select a Book to View Highlights">
      {books.map((book) => (
        <List.Item
          key={book.id}
          title={book.title}
          subtitle={book.author}
          icon={book.cover_url ? { source: book.cover_url, fallback: Icon.Book } : Icon.Book}
          actions={
            <ActionPanel>
              <Action
                title="Highlights"
                icon={Icon.Text}
                onAction={() => {
                  push(<HighlightsDetail bookId={book.id} bookTitle={book.title} />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {books.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Books Found"
          description="Your BookRise library appears to be empty."
          icon={Icon.Book}
        />
      )}
    </List>
  );
}

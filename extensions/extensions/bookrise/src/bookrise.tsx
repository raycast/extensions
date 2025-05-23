import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getBooks, Book } from "./api"; // Import from api.ts
// import ViewHighlightsCommand from "./viewHighlights"; // Keep if you want both actions
import ChatWithBookCommand from "./chatWithBook"; // Import the chat command component

export default function Command() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooks() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBooks = await getBooks();
        setBooks(fetchedBooks);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message || "Failed to fetch books");
          showToast({
            style: Toast.Style.Failure,
            title: "Error fetching books",
            message: e.message,
          });
        } else {
          setError("Failed to fetch books");
          showToast({
            style: Toast.Style.Failure,
            title: "Error fetching books",
            message: "An unknown error occurred",
          });
        }
      }
      setIsLoading(false);
    }

    fetchBooks();
  }, []);

  if (error) {
    // You might want a more sophisticated error UI
    // For now, List.EmptyView can show the error
  }

  return (
    <List isLoading={isLoading}>
      {error && <List.EmptyView title="Error Fetching Books" description={error} icon={Icon.Warning} />}
      {!isLoading && !error && books.length === 0 && (
        <List.EmptyView
          title="No Books Found"
          description="You don't have any books in your BookRise library yet, or the API returned an empty list."
          icon={Icon.Book}
        />
      )}
      {books.map((book) => (
        <List.Item
          key={book.id}
          icon={book.cover_url ? { source: book.cover_url, fallback: Icon.Book } : Icon.Book} // Use cover_url for icon
          title={book.title}
          subtitle={book.author || ""} // Display author if available
          // accessories will be empty for now, can add more details later
          actions={
            <ActionPanel>
              <Action.Push
                title="Chat with Book"
                icon={Icon.SpeechBubble}
                target={
                  <ChatWithBookCommand
                    arguments={{
                      bookId: book.id,
                      bookTitle: book.title,
                    }}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Book Title" content={book.title} />
              {/* <Action.Push 
                title="View Highlights"
                icon={Icon.TextDocument}
                target={<ViewHighlightsCommand arguments={{ bookId: book.id, bookTitle: book.title }} />}
              /> */}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

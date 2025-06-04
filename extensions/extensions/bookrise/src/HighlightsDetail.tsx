import { List, Icon, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { getHighlightsForBook, Highlight as HighlightType } from "./api";

interface HighlightsDetailProps {
  bookId: string;
  bookTitle: string;
}

function getColorEmoji(color?: string | null): string {
  switch (color?.toLowerCase()) {
    case "yellow":
      return "🟡";
    case "blue":
      return "🔵";
    case "pink":
      return "🌸";
    case "green":
      return "🟢";
    case "purple":
      return "🟣";
    case "orange":
      return "🟠";
    case "red":
      return "🔴";
    case "white":
      return "⚪️";
    case "gray":
    case "grey":
      return "🔘";
    default:
      return Icon.Text;
  }
}

export default function HighlightsDetail({ bookId, bookTitle }: HighlightsDetailProps) {
  const [highlights, setHighlights] = useState<HighlightType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHighlights() {
      if (!bookId) {
        setError("Book ID is missing.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedHighlights = await getHighlightsForBook(bookId);
        fetchedHighlights.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setHighlights(fetchedHighlights);
        setError(null);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message || "Failed to fetch highlights");
          showToast({ style: Toast.Style.Failure, title: "Error Fetching Highlights", message: e.message });
        } else {
          setError("Failed to fetch highlights");
          showToast({
            style: Toast.Style.Failure,
            title: "Error Fetching Highlights",
            message: "An unknown error occurred",
          });
        }
      }
      setIsLoading(false);
    }
    fetchHighlights();
  }, [bookId]);

  if (error) {
    return (
      <List isLoading={false} navigationTitle={`Highlights for ${bookTitle}`}>
        <List.EmptyView title="Error Fetching Highlights" description={error} icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Highlights for ${bookTitle}`} isShowingDetail>
      {highlights.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Highlights Found"
          description={`No highlights found for ${bookTitle}.`}
          icon={Icon.TextDocument}
        />
      )}
      {highlights.map((highlight) => {
        const detailMarkdown = `## ${getColorEmoji(highlight.color)} Highlight\n\n${highlight.text_content.replace(/\n/g, "\n\n")}`;

        return (
          <List.Item
            key={highlight.id}
            title={highlight.text_content}
            icon={getColorEmoji(highlight.color)}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Highlight Text" content={highlight.text_content} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

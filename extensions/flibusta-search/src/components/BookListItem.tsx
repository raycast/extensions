import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { OpdsBook } from "../types";
import { downloadFile } from "../utils/downloadUtils";
import { getBaseSiteUrl } from "../services/configService";

interface BookListItemProps {
  book: OpdsBook;
}

/**
 * Book list item component for displaying books in search results
 *
 * @param props Component props containing the book data
 * @returns List.Item component with book details and download actions
 */
export function BookListItem({ book }: BookListItemProps) {
  /**
   * Handle downloading a book in a specified format
   *
   * @param url The download URL path
   * @param format The file format (epub, fb2, mobi)
   */
  const handleDownload = async (url: string, format: string) => {
    const filename = `${book.title}.${format}`;
    const baseSiteUrl = getBaseSiteUrl();
    const fullUrl = `${baseSiteUrl}${url}`;
    await downloadFile(fullUrl, filename);
  };

  const accessories: List.Item.Accessory[] = [];

  if (book.format) {
    accessories.push({ text: book.format });
  }

  if (book.language) {
    accessories.push({ text: book.language });
  }

  return (
    <List.Item
      title={book.title}
      subtitle={book.author.name}
      accessories={accessories}
      icon={book.coverUrl ? { source: `${getBaseSiteUrl()}${book.coverUrl}` } : Icon.Book}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Download Options">
            {book.downloadLinks.epub && (
              <Action
                title="Download Epub"
                icon={Icon.Download}
                onAction={() => handleDownload(book.downloadLinks.epub!, "epub")}
              />
            )}
            {book.downloadLinks.fb2 && (
              <Action
                title="Download Fb2"
                icon={Icon.Download}
                onAction={() => handleDownload(book.downloadLinks.fb2!, "fb2")}
              />
            )}
            {book.downloadLinks.mobi && (
              <Action
                title="Download Mobi"
                icon={Icon.Download}
                onAction={() => handleDownload(book.downloadLinks.mobi!, "mobi")}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

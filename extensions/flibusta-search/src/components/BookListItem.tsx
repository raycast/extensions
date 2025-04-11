import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { OpdsBook } from "../types";
import { downloadFile } from "../utils/downloadUtils";
import { baseSiteUrl } from "../services/opdsService";

interface BookListItemProps {
  book: OpdsBook;
}

export function BookListItem({ book }: BookListItemProps) {
  const handleDownload = async (url: string, format: string) => {
    const filename = `${book.title}.${format}`;
    const fullUrl = `${baseSiteUrl}${url}`;
    await downloadFile(fullUrl, filename);
  };
  return (
    <List.Item
      title={book.title}
      subtitle={book.author.name}
      accessories={[{ text: book.format }]}
      actions={
        <ActionPanel>
          {book.downloadLinks.epub && (
            <ActionPanel.Section title="Download Options">
              <Action
                title="Download Epub"
                icon={Icon.Download}
                onAction={() => handleDownload(book.downloadLinks.epub!, "epub")}
              />
            </ActionPanel.Section>
          )}
          {book.downloadLinks.fb2 && (
            <ActionPanel.Section>
              <Action
                title="Download Fb2"
                icon={Icon.Download}
                onAction={() => handleDownload(book.downloadLinks.fb2!, "fb2")}
              />
            </ActionPanel.Section>
          )}
          {book.downloadLinks.mobi && (
            <ActionPanel.Section>
              <Action
                title="Download Mobi"
                icon={Icon.Download}
                onAction={() => handleDownload(book.downloadLinks.mobi!, "mobi")}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

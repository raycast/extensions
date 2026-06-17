import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";

import { downloadBook } from "@/functions/download-book";
import type { BookEntry, LibgenPreferences } from "@/types";
import { BookAction } from "@/types";

interface BookActionPanelProps {
  book: BookEntry;
}

export function BookActionPanel({ book }: BookActionPanelProps) {
  const { primaryAction } = getPreferenceValues<LibgenPreferences>();

  const actions = [
    <Action.OpenInBrowser
      key={BookAction.OpenDownloadPage}
      icon={{ source: Icon.Globe }}
      title="Open Download Page"
      url={book.downloadUrl}
    />,
    <Action.OpenInBrowser
      key={BookAction.OpenBookInfo}
      icon={{ source: Icon.Document }}
      title="Open Book Info Page"
      url={book.infoUrl}
    />,
    <Action
      key={BookAction.DownloadBook}
      icon={{ source: Icon.Download }}
      title="Download Book"
      onAction={() => downloadBook(book)}
    />,
  ];

  const nonPrimaryActions = actions.filter((action) => {
    return (action.key as unknown as BookAction) !== primaryAction;
  });

  return (
    <ActionPanel>
      {actions[primaryAction]}
      {nonPrimaryActions}
      <Action.CopyToClipboard title="Copy Book Info URL" content={book.infoUrl} />
    </ActionPanel>
  );
}

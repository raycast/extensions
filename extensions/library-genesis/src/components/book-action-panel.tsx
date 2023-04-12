import { Icon, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { downloadBook } from "../functions/download-book";
import { BookEntry } from "../types";
import { LibgenPreferences, BookAction } from "../types";

export function BookActionPanel(props: { book: BookEntry }) {
  const { book } = props;

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
    return action.key !== primaryAction;
  });

  return (
    <ActionPanel>
      {actions[primaryAction]}
      {nonPrimaryActions}
      <Action.CopyToClipboard title="Copy Book Info URL" content={book.infoUrl} />
    </ActionPanel>
  );
}

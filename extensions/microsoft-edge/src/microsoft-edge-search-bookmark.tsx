import { List, ToastStyle, showToast, ActionPanel, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";
import { useState, ReactElement } from "react";
import { BookmarkEntry, useEdgeBookmarkSearch } from "./hooks/useBookmarkSearch";
import { faviconUrl } from "./utils";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useEdgeBookmarkSearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString());
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {entries?.map((bookmarkEntry) => (
        <HistoryItem entry={bookmarkEntry} key={bookmarkEntry.id} />
      ))}
    </List>
  );
}

const HistoryItem = (props: { entry: BookmarkEntry }): ReactElement => {
  const { url, title } = props.entry;
  const id = props.entry.id.toString();
  const favicon = faviconUrl(64, url);

  return <List.Item id={id} title={title} subtitle={url} icon={favicon} actions={<Actions entry={props.entry} />} />;
};

const Actions = (props: { entry: BookmarkEntry }): ReactElement => {
  const { title, url } = props.entry;

  return (
    <ActionPanel title={title}>
      <OpenInBrowserAction title="Open in Browser" url={url} />
      <CopyToClipboardAction title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
};

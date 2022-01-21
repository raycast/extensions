import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";

import { ReadingListBookmark } from "../types";
import { formatDate, getFaviconUrl } from "../utils";

const BookmarkListItem = (props: { bookmark: ReadingListBookmark }) => (
  <List.Item
    title={props.bookmark.title}
    subtitle={props.bookmark.domain}
    icon={getFaviconUrl(props.bookmark.domain)}
    accessoryTitle={formatDate(props.bookmark.dateAdded)}
    actions={
      <ActionPanel>
        <OpenInBrowserAction url={props.bookmark.url} />
        <CopyToClipboardAction content={props.bookmark.url} title="Copy URL" />
      </ActionPanel>
    }
  />
);

export default BookmarkListItem;

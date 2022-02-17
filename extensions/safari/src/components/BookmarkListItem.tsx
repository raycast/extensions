import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";

import { ReadingListBookmark } from "../types";
import { formatDate, getFaviconUrl } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";

const Actions = (props: { bookmark: ReadingListBookmark }) => (
  <ActionPanel>
    <ActionPanel.Section>
      <OpenInBrowserAction url={props.bookmark.url} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <CopyUrlAction url={props.bookmark.url} />
      <CopyTitleAction title={props.bookmark.title} />
      <CopyMarkdownLinkAction title={props.bookmark.title} url={props.bookmark.url} />
    </ActionPanel.Section>
  </ActionPanel>
);

const BookmarkListItem = (props: { bookmark: ReadingListBookmark }) => (
  <List.Item
    title={props.bookmark.title}
    subtitle={props.bookmark.domain}
    icon={getFaviconUrl(props.bookmark.domain)}
    accessoryTitle={formatDate(props.bookmark.dateAdded)}
    actions={<Actions bookmark={props.bookmark} />}
  />
);

export default BookmarkListItem;

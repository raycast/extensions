import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { GeneralBookmark, ReadingListBookmark } from "../types";
import { formatDate } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import OpenNewWindowAction from "./OpenNewWindowAction";

const Actions = (props: { bookmark: ReadingListBookmark | GeneralBookmark }) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.OpenInBrowser url={props.bookmark.url} />
      <OpenNewWindowAction url={props.bookmark.url} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <CopyUrlAction url={props.bookmark.url} />
      <CopyTitleAction title={props.bookmark.title} />
      <CopyMarkdownLinkAction title={props.bookmark.title} url={props.bookmark.url} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.CreateQuicklink
        quicklink={{ link: props.bookmark.url, name: props.bookmark.title }}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
    </ActionPanel.Section>
  </ActionPanel>
);

const BookmarkListItem = (props: { bookmark: ReadingListBookmark | GeneralBookmark }) => (
  <List.Item
    title={props.bookmark.title}
    subtitle={props.bookmark.domain}
    icon={getFavicon(props.bookmark.url)}
    actions={<Actions bookmark={props.bookmark} />}
    accessories={
      "dateAdded" in props.bookmark
        ? [
            {
              text: formatDate(props.bookmark.dateAdded),
            },
          ]
        : [
            {
              tag: props.bookmark.folder,
            },
          ]
    }
  />
);

export default BookmarkListItem;

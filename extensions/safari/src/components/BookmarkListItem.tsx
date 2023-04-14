import { ActionPanel, List, Action } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { GeneralBookmark, ReadingListBookmark } from "../types";
import { executeJxa, formatDate, safariAppIdentifier } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import { closeMainWindow } from "@raycast/api";
import { Icon } from "@raycast/api";

const openInNewWindow = async (url: string) =>
  executeJxa(`
      const safari = Application("${safariAppIdentifier}");
      const doc = safari.Document().make();
      doc.url = "${url}"
      safari.activate()
  `);

const Actions = (props: { bookmark: ReadingListBookmark | GeneralBookmark }) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.OpenInBrowser url={props.bookmark.url} />
      <Action
        title="Open In New Window"
        icon={Icon.AppWindow}
        onAction={async () => {
          await closeMainWindow();
          await openInNewWindow(props.bookmark.url);
        }}
      />
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
        : undefined
    }
  />
);

export default BookmarkListItem;

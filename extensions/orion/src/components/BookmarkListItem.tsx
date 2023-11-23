import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Bookmark } from "../types";
import { extractDomainName } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";

const Actions = (props: { bookmark: Bookmark }) => (
  <ActionPanel title={props.bookmark.url}>
    <ActionPanel.Section>
      <Action.OpenInBrowser url={props.bookmark.url} />
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

const BookmarkListItem = (props: { bookmark: Bookmark }) => (
  <List.Item
    icon={props.bookmark.imageUrl ?? getFavicon(props.bookmark.url)}
    title={props.bookmark.title}
    subtitle={extractDomainName(props.bookmark.url)}
    keywords={props.bookmark.folders.concat([extractDomainName(props.bookmark.url)])}
    accessories={props.bookmark.folders.map((folder) => ({ text: folder, icon: Icon.Folder }))}
    actions={<Actions bookmark={props.bookmark} />}
  />
);

export default BookmarkListItem;

import { Action, ActionPanel, List, Color, Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { GeneralBookmark, ReadingListBookmark } from "../types";
import { formatDate } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import OpenNewWindowAction from "./OpenNewWindowAction";
import BookmarkTagColorForm from "./BookmarkTagColorForm";

const Actions = (props: { bookmark: ReadingListBookmark | GeneralBookmark; fetchTagColor?: () => void }) => (
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
    {!("dateAdded" in props.bookmark) && (
      <ActionPanel.Section>
        <Action.Push
          title="Setting Tag Color"
          icon={Icon.Tag}
          target={<BookmarkTagColorForm tagName={props.bookmark.folder} />}
          onPop={props.fetchTagColor}
        />
      </ActionPanel.Section>
    )}
  </ActionPanel>
);

export default function BookmarkListItem(props: {
  bookmark: ReadingListBookmark | GeneralBookmark;
  tagColor?: { [key: string]: string };
  fetchTagColor?: () => void;
}) {
  return (
    <List.Item
      title={props.bookmark.title}
      subtitle={props.bookmark.domain}
      icon={getFavicon(props.bookmark.url)}
      actions={<Actions bookmark={props.bookmark} fetchTagColor={props.fetchTagColor} />}
      accessories={
        "dateAdded" in props.bookmark
          ? [
              {
                text: formatDate(props.bookmark.dateAdded),
              },
            ]
          : [
              {
                tag: {
                  value: props.bookmark.folder,
                  color:
                    props.tagColor && props.tagColor[props.bookmark.folder]
                      ? Color[props.tagColor[props.bookmark.folder] as keyof typeof Color]
                      : undefined,
                },
              },
            ]
      }
    />
  );
}

import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Bookmark } from "../types";
import { faviconUrl } from "../utils";

dayjs.extend(relativeTime);

export default function BookmarkItem(props: { bookmark: Bookmark }) {
  const bookmark = props.bookmark;

  return (
    <List.Item
      id={String(bookmark._id)}
      icon={faviconUrl(64, bookmark.link)}
      key={bookmark._id}
      title={bookmark.title}
      subtitle={bookmark.tags.map((tag) => `#${tag}`).join(" ")}
      accessoryTitle={dayjs().to(dayjs(bookmark.lastUpdate))}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={bookmark.link} />
          <CopyToClipboardAction title="Copy URL" content={bookmark.link} />
        </ActionPanel>
      }
    />
  );
}

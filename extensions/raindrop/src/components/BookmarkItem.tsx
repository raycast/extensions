import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
} from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Bookmark } from '../types';

dayjs.extend(relativeTime);

export default function BookmarkItem(props: { bookmark: Bookmark }) {
  const bookmark = props.bookmark;

  return (
    <List.Item
      id={String(bookmark._id)}
      key={bookmark._id}
      title={bookmark.title}
      subtitle={bookmark.tags.map(tag => `#${tag}`).join(' ')}
      icon="raindrop-icon.png"
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

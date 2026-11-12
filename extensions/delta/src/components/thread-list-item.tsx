import { Color, Icon, List } from "@raycast/api";
import { parseDeltaDate } from "../lib/cli";
import { buildThreadMarkdown, getThreadTitle, getThreadWebUrl } from "../lib/threads";
import { Thread } from "../lib/types";

interface ThreadListItemProps {
  thread: Thread;
  /** When the detail pane is open, the date moves from the accessories into the pane. */
  isShowingDetail: boolean;
  actions: List.Item.Props["actions"];
}

export function ThreadListItem({ thread, isShowingDetail, actions }: ThreadListItemProps) {
  const createdAt = parseDeltaDate(thread.created_at_utc);

  const accessories: List.Item.Accessory[] = [];
  // The detail pane hides accessories and shows the status itself.
  if (thread.archived && !isShowingDetail) {
    accessories.push({ icon: { source: Icon.Box, tintColor: Color.SecondaryText }, tooltip: "Archived" });
  }
  if (!isShowingDetail && createdAt) {
    accessories.push({ date: createdAt, tooltip: `Created ${createdAt.toLocaleString()}` });
  }

  return (
    <List.Item
      title={getThreadTitle(thread)}
      icon={{ source: Icon.SpeechBubble, tintColor: thread.archived ? Color.SecondaryText : Color.Blue }}
      keywords={[thread.generated_title ?? "", ...thread.keywords].filter(Boolean)}
      accessories={accessories}
      actions={actions}
      detail={<ThreadDetail thread={thread} createdAt={createdAt} />}
    />
  );
}

function ThreadDetail({ thread, createdAt }: { thread: Thread; createdAt?: Date }) {
  const webUrl = getThreadWebUrl(thread);
  return (
    <List.Item.Detail
      markdown={buildThreadMarkdown(thread)}
      metadata={
        <List.Item.Detail.Metadata>
          {createdAt && <List.Item.Detail.Metadata.Label title="Created" text={createdAt.toLocaleString()} />}
          <List.Item.Detail.Metadata.Label title="Status" text={thread.archived ? "Archived" : "Active"} />
          {thread.keywords.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Keywords">
              {thread.keywords.slice(0, 8).map((keyword) => (
                <List.Item.Detail.Metadata.TagList.Item key={keyword} text={keyword} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {webUrl && <List.Item.Detail.Metadata.Link title="Link" text="Open on delta.dev" target={webUrl} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

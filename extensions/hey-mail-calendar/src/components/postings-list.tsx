import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReplyForm } from "./reply-form";
import { ThreadDetail } from "./thread-detail";
import { runHey } from "../lib/hey";
import type { HeyBox, HeyPosting } from "../lib/types";
import { senderName, topicIdFromUrl } from "../lib/types";

type PostingsListProps = {
  box: HeyBox;
};

export function PostingsList({ box }: PostingsListProps) {
  const { isLoading, data, error, revalidate } = usePromise(
    async () => {
      const response = await runHey<HeyBoxData>(["box", box.kind, "--json"]);
      return response.data.postings;
    },
    [],
    { keepPreviousData: true },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search ${box.name}…`} navigationTitle={box.name}>
      {error ? (
        <List.EmptyView
          title="Could Not Load Messages"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {(data ?? []).map((posting) => (
        <PostingItem key={posting.id} posting={posting} onChanged={() => revalidate()} />
      ))}
    </List>
  );
}

function PostingItem({ posting, onChanged }: { posting: HeyPosting; onChanged: () => void }) {
  const topicId = topicIdFromUrl(posting.app_url);

  return (
    <List.Item
      title={posting.name}
      subtitle={senderName(posting)}
      accessories={[{ date: new Date(posting.created_at) }]}
      detail={<List.Item.Detail markdown={posting.summary ? `> ${posting.summary}` : undefined} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Message">
            {topicId ? (
              <Action.Push
                title="Read Thread"
                icon={Icon.Eye}
                target={<ThreadDetail topicId={topicId} posting={posting} onChanged={onChanged} />}
              />
            ) : null}
            <Action title="Open in HEY" icon={Icon.Globe} onAction={() => open(posting.app_url)} />
            <Action.CopyToClipboard title="Copy Link" content={posting.app_url} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Status">
            <Action
              title="Mark as Seen"
              icon={Icon.CheckCircle}
              onAction={() => markPosting(posting.id, "seen", onChanged)}
            />
            <Action
              title="Mark as Unseen"
              icon={Icon.Circle}
              onAction={() => markPosting(posting.id, "unseen", onChanged)}
            />
          </ActionPanel.Section>
          {topicId ? (
            <ActionPanel.Section title="Reply">
              <Action.Push
                title="Reply"
                icon={Icon.Reply}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                target={<ReplyForm topicId={topicId} subject={posting.name} />}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

async function markPosting(id: number, action: "seen" | "unseen", onChanged: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: action === "seen" ? "Marking as seen…" : "Marking as unseen…",
  });
  try {
    await runHey([action, String(id)]);
    toast.style = Toast.Style.Success;
    toast.title = action === "seen" ? "Marked as seen" : "Marked as unseen";
    onChanged();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Update failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

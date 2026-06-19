import { Action, ActionPanel, Detail, Icon, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReplyForm } from "./reply-form";
import { runHey } from "../lib/hey";
import type { HeyPosting, HeyThreadEntry } from "../lib/types";
import { formatDate, plainTextBody } from "../lib/types";

type ThreadDetailProps = {
  topicId: string;
  posting: HeyPosting;
  onChanged?: () => void;
};

export function ThreadDetail({ topicId, posting, onChanged }: ThreadDetailProps) {
  const { isLoading, data, error, revalidate } = usePromise(async () => {
    const response = await runHey<HeyThreadEntry[]>(["threads", topicId, "--json"]);
    return response.data;
  });

  const markdown = (() => {
    if (error) {
      return `# Error\n\n${error.message}`;
    }
    if (!data?.length) {
      return `# ${posting.name}\n\nNo messages found.`;
    }
    return data
      .map((entry) => {
        const author = entry.alternative_sender_name || entry.creator?.name || "Unknown";
        const body = plainTextBody(entry.body);
        return `## ${author}\n_${formatDate(entry.created_at)}_\n\n${body}`;
      })
      .join("\n\n---\n\n");
  })();

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={posting.name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Message">
            <Action.Push
              title="Reply"
              icon={Icon.Reply}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              target={<ReplyForm topicId={topicId} subject={posting.name} />}
            />
            <Action title="Open in HEY" icon={Icon.Globe} onAction={() => open(posting.app_url)} />
            <Action.CopyToClipboard title="Copy Link" content={posting.app_url} />
            <Action title="Reload Thread" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
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
        </ActionPanel>
      }
    />
  );
}

async function markPosting(id: number, action: "seen" | "unseen", onChanged?: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: action === "seen" ? "Marking as seen…" : "Marking as unseen…",
  });
  try {
    await runHey([action, String(id)]);
    toast.style = Toast.Style.Success;
    toast.title = action === "seen" ? "Marked as seen" : "Marked as unseen";
    onChanged?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Update failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

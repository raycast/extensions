import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { pullRequestDetail, replyToThread, setThreadResolved } from "../lib/github";
import { avatar, relativeTime } from "../lib/format";
import type { PullRequest, ThreadDetail } from "../lib/types";
import { CommentForm } from "./comment-form";

type ReviewThreadsProps = {
  pr: PullRequest;
  /** Called after a reply or resolve, so the parent list can pick up the change. */
  onChange?: () => void;
};

/** The first line of a thread's opening comment, for the list subtitle. */
function excerpt(thread: ThreadDetail): string {
  const body = thread.comments[0]?.body ?? "";
  return body.split("\n").find((line) => line.trim().length > 0) ?? "";
}

/** Renders a thread's full conversation as markdown for the detail pane. */
function threadMarkdown(thread: ThreadDetail): string {
  const location = thread.line ? `${thread.path}:${thread.line}` : thread.path;
  const lines = [`### \`${location}\``, ""];

  for (const comment of thread.comments) {
    lines.push(`**@${comment.author || "ghost"}** · ${relativeTime(comment.createdAt)} ago`, "");
    lines.push(comment.body || "_(no text)_", "", "---", "");
  }
  return lines.join("\n");
}

/**
 * Lists a PR's inline review threads and lets you reply to or resolve them
 * without leaving Raycast — the same write actions the TUI's web dashboard has.
 */
export function ReviewThreads({ pr, onChange }: ReviewThreadsProps) {
  const [owner, name] = pr.repository.split("/");
  const { data, isLoading, revalidate } = useCachedPromise(
    (o: string, n: string, num: number) => pullRequestDetail(o, n, num),
    [owner, name, pr.number],
    { keepPreviousData: true },
  );

  const threads = data?.threads ?? [];
  const unresolved = threads.filter((t) => !t.resolved);
  const resolved = threads.filter((t) => t.resolved);

  async function toggleResolved(thread: ThreadDetail) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: thread.resolved ? "Unresolving…" : "Resolving…",
    });
    try {
      await setThreadResolved(thread.id, !thread.resolved);
      toast.style = Toast.Style.Success;
      toast.title = thread.resolved ? "Thread unresolved" : "Thread resolved";
      revalidate();
      onChange?.();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update the thread";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  function threadItem(thread: ThreadDetail) {
    const location = thread.line ? `${thread.path}:${thread.line}` : thread.path;
    const last = thread.comments[thread.comments.length - 1];

    return (
      <List.Item
        key={thread.id}
        icon={
          thread.resolved
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.SpeechBubbleActive, tintColor: Color.Orange }
        }
        title={location}
        subtitle={excerpt(thread)}
        accessories={[
          ...(thread.outdated ? [{ tag: { value: "outdated", color: Color.SecondaryText } }] : []),
          { text: `${thread.comments.length} 💬` },
          ...(last ? [{ icon: avatar(last.author), tooltip: `Last reply by @${last.author}` }] : []),
          ...(last ? [{ text: relativeTime(last.createdAt) }] : []),
        ]}
        detail={<List.Item.Detail markdown={threadMarkdown(thread)} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Reply}
                title="Reply to Thread"
                target={
                  <CommentForm
                    navigationTitle={`Reply · ${location}`}
                    label="Reply"
                    submitTitle="Post Reply"
                    context={`${pr.repository}#${pr.number} — ${location}`}
                    onSubmit={async (body) => {
                      await replyToThread(thread.id, body);
                      revalidate();
                      onChange?.();
                    }}
                  />
                }
              />
              <Action
                icon={thread.resolved ? Icon.Circle : Icon.CheckCircle}
                title={thread.resolved ? "Unresolve Thread" : "Resolve Thread"}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => toggleResolved(thread)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {thread.url ? <Action.OpenInBrowser title="Open Thread on GitHub" url={thread.url} /> : null}
              <Action.OpenInBrowser title="Open Pull Request" url={pr.url} />
              <Action
                icon={Icon.ArrowClockwise}
                title="Refresh"
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={threads.length > 0}
      navigationTitle={`${pr.repository}#${pr.number} · Review threads`}
      searchBarPlaceholder="Filter threads by file…"
    >
      <List.EmptyView
        icon={Icon.SpeechBubble}
        title={isLoading ? "Loading threads…" : "No review threads"}
        description={isLoading ? undefined : "Nobody has left an inline comment on this pull request yet."}
      />
      <List.Section title="Unresolved" subtitle={unresolved.length ? String(unresolved.length) : undefined}>
        {unresolved.map(threadItem)}
      </List.Section>
      <List.Section title="Resolved" subtitle={resolved.length ? String(resolved.length) : undefined}>
        {resolved.map(threadItem)}
      </List.Section>
    </List>
  );
}

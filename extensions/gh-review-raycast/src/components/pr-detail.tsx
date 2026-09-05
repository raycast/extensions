import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { absoluteTime, diffStat, relativeTime, reviewDecisionLabel, timelineEmoji, timelineLabel } from "../lib/format";
import { addComment, pullRequestDetail } from "../lib/github";
import type { PRDetail, PullRequest } from "../lib/types";
import { CommentForm } from "./comment-form";
import { ReviewThreads } from "./review-threads";
import { Timeline } from "./timeline";

type PRDetailViewProps = {
  pr: PullRequest;
  /** Called after a write, so the parent list can pick up the change. */
  onChange?: () => void;
};

/** Builds the markdown body: description, then the full activity timeline. */
function markdown(pr: PullRequest, detail: PRDetail | undefined, isLoading: boolean): string {
  const lines = [`# ${pr.title}`, "", `[${pr.repository}#${pr.number}](${pr.url})`, ""];

  if (detail?.body) {
    lines.push("---", "", detail.body, "");
  }

  if (isLoading && !detail) {
    lines.push("---", "", "_Loading the conversation…_");
    return lines.join("\n");
  }

  const timeline = [...(detail?.timeline ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  if (timeline.length === 0) {
    return lines.join("\n");
  }

  lines.push("---", "", "## Timeline", "");
  for (const event of timeline) {
    const who = event.actor ? `**@${event.actor}**` : "**someone**";

    // Comment and review bodies are prose — they read better as a quote under
    // the header. Everything else (a label, a reviewer, a new title) is short
    // enough to sit inline.
    const isProse = event.kind === "comment" || event.kind.startsWith("review-");
    const inline = !isProse && event.text ? ` \`${event.text}\`` : "";

    lines.push(
      `${timelineEmoji(event.kind)} ${who} ${timelineLabel(event.kind)}${inline} · ${relativeTime(event.at)} ago`,
      "",
    );

    if (isProse && event.text) {
      lines.push(
        event.text
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n"),
        "",
      );
    }
  }
  return lines.join("\n");
}

/**
 * The full-screen view of one pull request: description, timeline, and the
 * write actions (comment, reply, resolve) that the TUI exposes through its web
 * dashboard.
 */
export function PRDetailView({ pr, onChange }: PRDetailViewProps) {
  const [owner, name] = pr.repository.split("/");
  const { data, isLoading, revalidate } = useCachedPromise(
    (o: string, n: string, num: number) => pullRequestDetail(o, n, num),
    [owner, name, pr.number],
    { keepPreviousData: true },
  );

  const unresolved = data ? data.threads.filter((t) => !t.resolved).length : pr.unresolved;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${pr.repository}#${pr.number}`}
      markdown={markdown(pr, data, isLoading)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Author" text={pr.author ? `@${pr.author}` : "unknown"} />
          <Detail.Metadata.Label title="Repository" text={pr.repository} />
          <Detail.Metadata.TagList title="Status">
            {pr.isDraft ? <Detail.Metadata.TagList.Item text="Draft" color={Color.SecondaryText} /> : null}
            <Detail.Metadata.TagList.Item
              text={reviewDecisionLabel(pr.reviewDecision)}
              color={
                pr.reviewDecision === "APPROVED"
                  ? Color.Green
                  : pr.reviewDecision === "CHANGES_REQUESTED"
                    ? Color.Red
                    : Color.Yellow
              }
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Changes" text={`${diffStat(pr)} in ${pr.changedFiles} files`} />
          <Detail.Metadata.Label
            title="Conversation"
            text={`${pr.comments} comments · ${unresolved} unresolved threads`}
          />
          {pr.awaitingReply > 0 ? (
            <Detail.Metadata.Label
              title="Awaiting your reply"
              icon={{ source: Icon.Reply, tintColor: Color.Orange }}
              text={
                pr.latestReplier
                  ? `${pr.awaitingReply} thread(s) · last from @${pr.latestReplier}`
                  : `${pr.awaitingReply} thread(s)`
              }
            />
          ) : null}
          {pr.labels.length > 0 ? (
            <Detail.Metadata.TagList title="Labels">
              {pr.labels.map((label) => (
                <Detail.Metadata.TagList.Item key={label.name} text={label.name} color={`#${label.color}`} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {pr.reviewers.length > 0 ? <Detail.Metadata.Label title="Reviewers" text={pr.reviewers.join(", ")} /> : null}
          {pr.assignees.length > 0 ? <Detail.Metadata.Label title="Assignees" text={pr.assignees.join(", ")} /> : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Opened" text={absoluteTime(pr.createdAt)} />
          <Detail.Metadata.Label title="Last activity" text={`${relativeTime(pr.lastActivity)} ago`} />
          <Detail.Metadata.Link title="On GitHub" target={pr.url} text={`${pr.repository}#${pr.number}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={pr.url} />
            <Action.Push
              icon={Icon.SpeechBubbleActive}
              title="Review Threads"
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              target={
                <ReviewThreads
                  pr={pr}
                  onChange={() => {
                    revalidate();
                    onChange?.();
                  }}
                />
              }
            />
            <Action.Push
              icon={Icon.Clock}
              title="Timeline"
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={<Timeline pr={pr} events={data?.timeline} />}
            />
            <Action.Push
              icon={Icon.Pencil}
              title="Add Comment"
              shortcut={Keyboard.Shortcut.Common.New}
              target={
                <CommentForm
                  navigationTitle={`Comment on ${pr.repository}#${pr.number}`}
                  label="Comment"
                  submitTitle="Post Comment"
                  context={pr.title}
                  onSubmit={async (body) => {
                    if (!data?.id) throw new Error("The pull request is still loading — try again in a moment.");
                    await addComment(data.id, body);
                    revalidate();
                    onChange?.();
                  }}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy URL" content={pr.url} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.CopyToClipboard title="Copy Reference" content={`${pr.repository}#${pr.number}`} />
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

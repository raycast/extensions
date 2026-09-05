import { Color, Icon, List } from "@raycast/api";

import { agingOf, describeDuration, elapsedSince } from "../lib/aging";
import { absoluteTime, avatar, diffStat, reviewDecisionLabel, stalenessStyle } from "../lib/format";
import type { PullRequest } from "../lib/types";

/**
 * The side pane for a row in the pull request list.
 *
 * Everything here comes from the search response the list already made, so
 * opening the pane costs no extra requests — it just surfaces the fields a
 * single-line row has no room for.
 */
export function PRListDetail({ pr }: { pr: PullRequest }) {
  const aging = agingOf(pr);
  const staleness = stalenessStyle(aging.level);
  const decisionColor =
    pr.reviewDecision === "APPROVED"
      ? Color.Green
      : pr.reviewDecision === "CHANGES_REQUESTED"
        ? Color.Red
        : Color.Yellow;

  const markdown = [
    `## ${pr.title}`,
    "",
    `[${pr.repository} #${pr.number}](${pr.url})`,
    "",
    "---",
    "",
    pr.awaitingReply > 0
      ? `> ⏳ **${pr.awaitingReply} ${pr.awaitingReply === 1 ? "conversation is" : "conversations are"} waiting on you**` +
        (pr.latestReplier ? ` — the last word was **@${pr.latestReplier}**'s` : "") +
        (pr.awaitingSince ? `, ${describeDuration(elapsedSince(pr.awaitingSince))} ago.` : ".") +
        (pr.awaitingUrl ? `\n>\n> [Jump straight to the comment ↗](${pr.awaitingUrl})` : "")
      : pr.unresolved > 0
        ? `> 💬 **${pr.unresolved} unresolved ${pr.unresolved === 1 ? "thread" : "threads"}** — but none of them need you next.`
        : "> ✅ Nothing outstanding on this one.",
    "",
    pr.newSince ? "> 🆕 There's been activity since you last looked at it." : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Author"
            text={pr.author ? `@${pr.author}` : "unknown"}
            icon={pr.author ? avatar(pr.author) : Icon.Person}
          />
          <List.Item.Detail.Metadata.Label title="Repository" text={pr.repository} />

          <List.Item.Detail.Metadata.TagList title="Status">
            {pr.isDraft ? <List.Item.Detail.Metadata.TagList.Item text="Draft" color={Color.SecondaryText} /> : null}
            <List.Item.Detail.Metadata.TagList.Item
              text={reviewDecisionLabel(pr.reviewDecision)}
              color={decisionColor}
            />
            {pr.newSince ? <List.Item.Detail.Metadata.TagList.Item text="New activity" color={Color.Orange} /> : null}
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Changes"
            text={`${diffStat(pr)} across ${pr.changedFiles} ${pr.changedFiles === 1 ? "file" : "files"}`}
          />
          <List.Item.Detail.Metadata.Label
            title="Conversation"
            text={`${pr.comments} comments · ${pr.threads} threads · ${pr.unresolved} unresolved`}
          />
          {pr.awaitingReply > 0 && pr.awaitingUrl ? (
            <List.Item.Detail.Metadata.Link
              title="Awaiting your reply"
              target={pr.awaitingUrl}
              text={
                pr.latestReplier ? `${pr.awaitingReply} · go to @${pr.latestReplier}'s comment` : "Go to the comment"
              }
            />
          ) : pr.awaitingReply > 0 ? (
            <List.Item.Detail.Metadata.Label
              title="Awaiting your reply"
              icon={{ source: Icon.Reply, tintColor: Color.Blue }}
              text={
                pr.latestReplier ? `${pr.awaitingReply} · last from @${pr.latestReplier}` : String(pr.awaitingReply)
              }
            />
          ) : null}

          {pr.labels.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Labels">
              {pr.labels.map((label) => (
                <List.Item.Detail.Metadata.TagList.Item key={label.name} text={label.name} color={`#${label.color}`} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}

          <List.Item.Detail.Metadata.Label
            title="Reviewers"
            text={pr.reviewers.length > 0 ? pr.reviewers.map((r) => (r.startsWith("@") ? r : `@${r}`)).join(", ") : "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Assignees"
            text={pr.assignees.length > 0 ? pr.assignees.map((a) => `@${a}`).join(", ") : "—"}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.TagList title="Ageing">
            <List.Item.Detail.Metadata.TagList.Item text={staleness.label} color={staleness.color} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Open for"
            text={`${describeDuration(elapsedSince(pr.createdAt))} · since ${absoluteTime(pr.createdAt)}`}
          />
          <List.Item.Detail.Metadata.Label
            title="Untouched for"
            text={`${describeDuration(elapsedSince(pr.lastActivity))} · last activity ${absoluteTime(pr.lastActivity)}`}
          />
          {aging.waitingDays !== undefined ? (
            <List.Item.Detail.Metadata.Label
              title="Waiting on you for"
              icon={{ source: Icon.Hourglass, tintColor: staleness.color }}
              text={`${describeDuration(elapsedSince(pr.awaitingSince))} · since ${absoluteTime(pr.awaitingSince)}`}
            />
          ) : null}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link title="On GitHub" target={pr.url} text={`${pr.repository}#${pr.number}`} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

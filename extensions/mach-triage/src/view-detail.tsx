import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { BridgeClientError, fetchIssueDetail } from "./lib/bridge";
import { descriptionToMarkdown } from "./lib/adf-to-markdown";
import { AddCommentAction, ChangeStatusAction, LogWorkAction, OpenInMachTriageAction } from "./lib/ticket-actions";
import type { IssueDetailResponse } from "./lib/types";

export default function ViewDetailCommand() {
  return <Detail markdown="Use **Search Tickets** or **Today Board** to navigate to an issue." />;
}

export function IssueDetail({ issueId }: { issueId: string }) {
  const { data, isLoading, error } = useCachedPromise(
    async (id: string) => {
      try {
        return await fetchIssueDetail(id);
      } catch (e) {
        if (e instanceof BridgeClientError) {
          await showToast({ style: Toast.Style.Failure, title: e.message });
        }
        throw e;
      }
    },
    [issueId],
  );

  if (error && !data) {
    return (
      <Detail markdown={`# Error\n\n${error instanceof BridgeClientError ? error.message : "Failed to load issue"}`} />
    );
  }

  if (!data) {
    return <Detail isLoading={isLoading} markdown="Loading issue…" />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(data)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Key" text={data.externalKey} />
          <Detail.Metadata.Label title="Status" text={data.status.replace("_", " ")} />
          {data.priority ? <Detail.Metadata.Label title="Priority" text={data.priority} /> : null}
          {data.issueType ? <Detail.Metadata.Label title="Type" text={data.issueType} /> : null}
          {data.assigneeDisplayName ? <Detail.Metadata.Label title="Assignee" text={data.assigneeDisplayName} /> : null}
          <Detail.Metadata.Label title="Provider" text={data.providerType} />
          <Detail.Metadata.Separator />
          {data.localTrack ? (
            <Detail.Metadata.TagList title="Today Track">
              <Detail.Metadata.TagList.Item text={data.localTrack} />
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Label title="Sync" text={data.syncStatus} />
          <Detail.Metadata.Label title="Updated" text={formatDate(data.updatedAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <OpenInMachTriageAction
            ticket={{ id: data.id, externalKey: data.externalKey, providerType: data.providerType }}
          />
          <ChangeStatusAction
            ticket={{ id: data.id, externalKey: data.externalKey, providerType: data.providerType }}
          />
          <AddCommentAction ticket={{ id: data.id, externalKey: data.externalKey, providerType: data.providerType }} />
          <LogWorkAction ticket={{ id: data.id, externalKey: data.externalKey, providerType: data.providerType }} />
          <Action.CopyToClipboard title="Copy Key" content={data.externalKey} />
          <Action.CopyToClipboard
            title="Copy Title"
            content={`${data.externalKey} ${data.title}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(issue: IssueDetailResponse): string {
  const lines: string[] = [];

  lines.push(`# ${issue.externalKey} — ${issue.title}`);
  lines.push("");

  if (issue.description) {
    const md = descriptionToMarkdown(issue.description);
    const desc = md.length > 3000 ? md.slice(0, 3000) + "…" : md;
    lines.push(desc);
    lines.push("");
  }

  if (issue.comments.length > 0) {
    lines.push("---");
    lines.push(`## Comments (${issue.comments.length})`);
    lines.push("");
    for (const c of issue.comments.slice(-5)) {
      const author = c.authorName ?? "Unknown";
      const date = c.createdAt ? formatDate(c.createdAt) : "";
      lines.push(`**${author}** ${date}`);
      lines.push("");
      lines.push(c.body ? descriptionToMarkdown(c.body) : "*(empty)*");
      lines.push("");
    }
  }

  if (issue.worklogs.length > 0) {
    lines.push("---");
    lines.push(`## Work Logs (${issue.worklogs.length})`);
    lines.push("");
    lines.push("| Date | Duration | Note |");
    lines.push("|------|----------|------|");
    for (const w of issue.worklogs.slice(0, 10)) {
      const dur = formatDuration(w.timeSpentSeconds);
      const date = formatDate(w.startedAt);
      lines.push(`| ${date} | ${dur} | ${w.comment ?? "—"} |`);
    }
  }

  return lines.join("\n");
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

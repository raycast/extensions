import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getIssue, listComments } from "../lib/api";
import { actorIcon, actorName, issueUrl, priorityInfo, statusIcon, statusName } from "../lib/format";
import type { WorkspaceContext } from "../lib/hooks";
import type { Comment, Issue } from "../lib/types";
import { IssueActions } from "./IssueActions";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function formatDate(value: string | null | undefined): string | undefined {
  return value ? dateFormat.format(new Date(value)) : undefined;
}

function renderComments(comments: Comment[], context: WorkspaceContext): string {
  const visible = comments.filter((c) => c.content?.trim());
  if (!visible.length) return "";
  const body = visible
    .map((c) => {
      const author = actorName(c.author_type, c.author_id, context) ?? "Unknown";
      const quote = c.parent_id ? "↳ " : "";
      return `${quote}**${author}** · ${formatDate(c.created_at)}\n\n${c.content}`;
    })
    .join("\n\n---\n\n");
  return `\n\n---\n\n## Comments (${visible.length})\n\n${body}`;
}

export function IssueDetail(props: { issue: Issue; context: WorkspaceContext; onChange?: () => void }) {
  const { context, onChange } = props;
  const workspaceId = context.workspace.id;

  const {
    data: issue,
    isLoading: issueLoading,
    revalidate: revalidateIssue,
  } = useCachedPromise(getIssue, [workspaceId, props.issue.id], { initialData: props.issue, keepPreviousData: true });
  const {
    data: comments,
    isLoading: commentsLoading,
    revalidate: revalidateComments,
  } = useCachedPromise(listComments, [workspaceId, props.issue.id]);

  const refresh = () => {
    revalidateIssue();
    revalidateComments();
    onChange?.();
  };

  const priority = priorityInfo(issue.priority);
  const assignee = actorName(issue.assignee_type, issue.assignee_id, context);
  const creator = actorName(issue.creator_type, issue.creator_id, context);

  const markdown =
    `# ${issue.title}\n\n` +
    (issue.description?.trim() || "_No description._") +
    (comments ? renderComments(comments, context) : "");

  return (
    <Detail
      navigationTitle={issue.identifier}
      isLoading={issueLoading || commentsLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Issue" text={issue.identifier} target={issueUrl(context.workspace, issue)} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={issue.status_name ?? statusName(issue.status, context.statuses)}
              icon={statusIcon(issue.status, context.statuses)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Priority" text={priority.name} icon={priority.icon} />
          <Detail.Metadata.Label
            title="Assignee"
            text={assignee ?? "Unassigned"}
            icon={assignee ? actorIcon(issue.assignee_type, issue.assignee_id, context) : undefined}
          />
          {issue.labels && issue.labels.length > 0 && (
            <Detail.Metadata.TagList title="Labels">
              {issue.labels.map((label) => (
                <Detail.Metadata.TagList.Item
                  key={label.id}
                  text={label.name}
                  color={label.color?.startsWith("#") ? label.color : undefined}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {creator && (
            <Detail.Metadata.Label
              title="Created By"
              text={creator}
              icon={actorIcon(issue.creator_type, issue.creator_id, context)}
            />
          )}
          <Detail.Metadata.Label title="Created" text={formatDate(issue.created_at)} />
          <Detail.Metadata.Label title="Updated" text={formatDate(issue.updated_at)} />
          {issue.due_date && <Detail.Metadata.Label title="Due" text={formatDate(issue.due_date)} />}
        </Detail.Metadata>
      }
      actions={<IssueActions issue={issue} context={context} onChange={refresh} isDetail />}
    />
  );
}

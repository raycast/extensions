import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  addComment,
  getIssue,
  getPriorities,
  getProjectMembers,
  getIssueStatuses,
  IssueDetail,
  IssueUpdate,
  priorityColor,
  redmineUrl,
  updateIssue,
} from "./redmine";

interface Ref {
  id: number;
  name: string;
}

export function IssueDetailView({ issueId }: { issueId: number }) {
  const [issue, setIssue] = useState<IssueDetail>();
  const [isLoading, setIsLoading] = useState(true);
  const [statuses, setStatuses] = useState<Ref[]>([]);
  const [priorities, setPriorities] = useState<Ref[]>([]);
  const [members, setMembers] = useState<Ref[]>([]);

  async function load() {
    setIsLoading(true);
    try {
      const fetched = await getIssue(issueId);
      setIssue(fetched);
      const [prios, membs, allStatuses] = await Promise.all([
        getPriorities().catch(() => []),
        getProjectMembers(fetched.project.id).catch(() => []),
        // An empty `allowed_statuses` means the workflow permits no transition at all,
        // so only fall back to every status when the instance omits the field (Redmine < 5.0).
        fetched.allowed_statuses !== undefined
          ? Promise.resolve(fetched.allowed_statuses)
          : getIssueStatuses().catch(() => []),
      ]);
      setPriorities(prios);
      setMembers(membs);
      setStatuses(allStatuses);
    } catch (e) {
      if (e instanceof Error) showToast(Toast.Style.Failure, e.name, e.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [issueId]);

  async function applyUpdate(update: IssueUpdate, successMessage: string) {
    const toast = await showToast(Toast.Style.Animated, "Updating issue…");
    try {
      await updateIssue(issueId, update);
      toast.style = Toast.Style.Success;
      toast.title = successMessage;
      await load();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = e instanceof Error ? e.name : "Update failed";
      toast.message = e instanceof Error ? e.message : undefined;
    }
  }

  const markdown = issue
    ? `# #${issue.id} · ${issue.subject}\n\n${issue.description || "_No description_"}\n\n${journalsMarkdown(issue)}`
    : "";

  const url = `${redmineUrl}/issues/${issueId}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={issue ? `#${issue.id} ${issue.subject}` : `Issue #${issueId}`}
      markdown={markdown}
      metadata={
        issue ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Project" text={issue.project.name} />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={issue.status.name} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Priority">
              <Detail.Metadata.TagList.Item text={issue.priority.name} color={priorityColor(issue.priority.name)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Assignee" text={issue.assigned_to?.name ?? "Unassigned"} />
            <Detail.Metadata.Label title="Tracker" text={issue.tracker.name} />
            <Detail.Metadata.Label title="Author" text={issue.author?.name ?? "—"} />
            {typeof issue.done_ratio === "number" ? (
              <Detail.Metadata.Label title="Done" text={`${issue.done_ratio}%`} />
            ) : null}
            {issue.start_date ? <Detail.Metadata.Label title="Start date" text={issue.start_date} /> : null}
            {issue.due_date ? <Detail.Metadata.Label title="Due date" text={issue.due_date} /> : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Open" target={url} text={`#${issue.id}`} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Edit">
            <Action.Push
              title="Add Comment"
              icon={Icon.SpeechBubble}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CommentForm issueId={issueId} onSubmitted={load} />}
            />
            <ActionPanel.Submenu title="Change Status" icon={Icon.Circle} shortcut={{ modifiers: ["cmd"], key: "s" }}>
              {statuses.map((s) => (
                <Action
                  key={s.id}
                  title={s.name}
                  autoFocus={issue?.status.id === s.id}
                  onAction={() => applyUpdate({ status_id: s.id }, `Status → ${s.name}`)}
                />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu title="Change Assignee" icon={Icon.Person} shortcut={{ modifiers: ["cmd"], key: "a" }}>
              <Action
                title="Unassigned"
                autoFocus={!issue?.assigned_to}
                onAction={() => applyUpdate({ assigned_to_id: "" }, "Assignee cleared")}
              />
              {members.map((m) => (
                <Action
                  key={m.id}
                  title={m.name}
                  autoFocus={issue?.assigned_to?.id === m.id}
                  onAction={() => applyUpdate({ assigned_to_id: m.id }, `Assigned to ${m.name}`)}
                />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu
              title="Change Priority"
              icon={Icon.Exclamationmark}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            >
              {priorities.map((p) => (
                <Action
                  key={p.id}
                  title={p.name}
                  autoFocus={issue?.priority.id === p.id}
                  onAction={() => applyUpdate({ priority_id: p.id }, `Priority → ${p.name}`)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section title="Issue">
            <Action.OpenInBrowser url={url} />
            <Action.CopyToClipboard content={url} title="Copy URL" />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={load}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CommentForm({ issueId, onSubmitted }: { issueId: number; onSubmitted: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: { notes: string }) {
    if (!values.notes.trim()) {
      showToast(Toast.Style.Failure, "Comment is empty");
      return;
    }
    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Posting comment…");
    try {
      await addComment(issueId, values.notes.trim());
      toast.style = Toast.Style.Success;
      toast.title = "Comment added";
      onSubmitted();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = e instanceof Error ? e.name : "Failed";
      toast.message = e instanceof Error ? e.message : undefined;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Comment on #${issueId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Comment" icon={Icon.SpeechBubble} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="notes" title="Comment" placeholder="Write your comment (Textile/Markdown)…" enableMarkdown />
    </Form>
  );
}

function journalsMarkdown(issue: IssueDetail): string {
  const notes = (issue.journals ?? []).filter((j) => j.notes && j.notes.trim().length > 0);
  if (notes.length === 0) return "";
  const lines = notes.map((j) => {
    const who = j.user?.name ?? "Someone";
    const when = j.created_on?.slice(0, 10) ?? "";
    return `**${who}** · ${when}\n\n${j.notes}`;
  });
  return `---\n\n## Comments\n\n${lines.join("\n\n---\n\n")}`;
}

import { Action, ActionPanel, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { updateIssue } from "../lib/api";
import { PRIORITIES, actorIcon, issueUrl, statusIcon, statusOptions } from "../lib/format";
import type { WorkspaceContext } from "../lib/hooks";
import type { Issue, UpdateIssueInput } from "../lib/types";
import { CommentForm } from "./CommentForm";
import { DelegateForm } from "./DelegateForm";
import { IssueDetail } from "./IssueDetail";

async function applyUpdate(context: WorkspaceContext, issue: Issue, patch: UpdateIssueInput, onChange?: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${issue.identifier}` });
  try {
    await updateIssue(context.workspace.id, issue.id, patch);
    toast.style = Toast.Style.Success;
    toast.title = `Updated ${issue.identifier}`;
    onChange?.();
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't update ${issue.identifier}` });
  }
}

export function IssueActions(props: {
  issue: Issue;
  context: WorkspaceContext;
  onChange?: () => void;
  /** Hide "Show Details" when already on the detail view. */
  isDetail?: boolean;
  /** Extra actions rendered first, e.g. inbox-specific ones. */
  children?: React.ReactNode;
}) {
  const { issue, context, onChange, isDetail, children } = props;
  const url = issueUrl(context.workspace, issue);
  const update = (patch: UpdateIssueInput) => applyUpdate(context, issue, patch, onChange);
  const { me } = context;
  const agents = context.agents?.filter((a) => !a.archived_at) ?? [];
  const members = context.members?.filter((m) => m.user_id !== me?.id) ?? [];

  return (
    <ActionPanel title={issue.identifier}>
      {children}
      <ActionPanel.Section>
        {!isDetail && (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<IssueDetail issue={issue} context={context} onChange={onChange} />}
          />
        )}
        <Action.OpenInBrowser url={url} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <ActionPanel.Submenu title="Set Status…" icon={Icon.Circle} shortcut={{ modifiers: ["opt", "cmd"], key: "s" }}>
          {statusOptions(context.statuses).map((s) => (
            <Action
              key={s.key}
              title={s.name}
              icon={statusIcon(s.key, context.statuses)}
              onAction={() => update({ status: s.key })}
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu
          title="Set Priority…"
          icon={Icon.FullSignal}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        >
          {PRIORITIES.map((p) => (
            <Action key={p.value} title={p.name} icon={p.icon} onAction={() => update({ priority: p.value })} />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu
          title="Assign to…"
          icon={Icon.AddPerson}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        >
          {me && (
            <Action
              title="Me"
              icon={actorIcon("member", me.id, context)}
              onAction={() => update({ assignee_type: "member", assignee_id: me.id })}
            />
          )}
          <ActionPanel.Section title="Agents">
            {agents.map((a) => (
              <Action
                key={a.id}
                title={a.name}
                icon={actorIcon("agent", a.id, context)}
                onAction={() => update({ assignee_type: "agent", assignee_id: a.id })}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Members">
            {members.map((m) => (
              <Action
                key={m.user_id}
                title={m.name}
                icon={actorIcon("member", m.user_id, context)}
                onAction={() => update({ assignee_type: "member", assignee_id: m.user_id })}
              />
            ))}
          </ActionPanel.Section>
          {issue.assignee_id && (
            <Action
              title="Unassign"
              icon={Icon.RemovePerson}
              onAction={() => update({ assignee_type: null, assignee_id: null })}
            />
          )}
        </ActionPanel.Submenu>
        <Action.Push
          title="Delegate Sub-Issue"
          icon={Icon.Stars}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          target={<DelegateForm parentIssue={issue} />}
        />
        <Action.Push
          title="Add Comment"
          icon={Icon.SpeechBubble}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          target={<CommentForm issue={issue} context={context} onCommented={onChange} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Identifier"
          content={issue.identifier}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyDeeplink} />
        <Action.CopyToClipboard
          title="Copy as Markdown Link"
          content={`[${issue.identifier}: ${issue.title}](${url})`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
        {onChange && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onChange}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

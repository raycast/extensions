import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { ErrorEmptyView } from "./components/ErrorEmptyView";
import { IssueDetail } from "./components/IssueDetail";
import { IssueListItem } from "./components/IssueListItem";
import { WorkspaceDropdown } from "./components/WorkspaceDropdown";
import { archiveInboxItem, getIssue, listInbox, listIssues, markAllInboxRead, setInboxRead } from "./lib/api";
import { INBOX_SEVERITY, actorIcon, actorName, webUrl } from "./lib/format";
import { WorkspaceContext, useWorkspace, useWorkspaceContext } from "./lib/hooks";
import type { InboxItem } from "./lib/types";

const PAGE_SIZE = 50;

export interface InboxLaunchContext {
  workspaceId?: string;
}

export default function Inbox(props: LaunchProps<{ launchContext?: InboxLaunchContext }>) {
  const {
    workspaces,
    workspace,
    setWorkspaceId,
    isLoading: workspaceLoading,
    error,
  } = useWorkspace(props.launchContext?.workspaceId);
  const { context, isLoading: contextLoading } = useWorkspaceContext(workspace);
  const workspaceId = workspace?.id ?? "";
  const myId = context?.me?.id;

  const inbox = useCachedPromise(listInbox, [workspaceId], { execute: Boolean(workspace) });
  const assigned = useCachedPromise(
    (wsId: string, userId: string) =>
      async ({ page }: { page: number }) => {
        const offset = page * PAGE_SIZE;
        const { issues, total } = await listIssues(wsId, {
          assignee_id: userId,
          assignee_types: "member",
          status_category: "unstarted,started",
          sort: "updated_at",
          direction: "desc",
          limit: PAGE_SIZE,
          offset,
        });
        return { data: issues, hasMore: offset + issues.length < total };
      },
    [workspaceId, myId ?? ""],
    { execute: Boolean(workspace && myId) },
  );
  const assignedCount = assigned.data?.length ?? 0;

  if (error && !workspaces) {
    return (
      <List>
        <ErrorEmptyView error={error} />
      </List>
    );
  }

  const notifications = (inbox.data ?? []).filter((item) => !item.archived);
  const unread = notifications.filter((item) => !item.read).length;

  const loading = workspaceLoading || contextLoading || inbox.isLoading || assigned.isLoading;

  return (
    <List
      isLoading={loading}
      pagination={assigned.pagination}
      searchBarPlaceholder="Filter notifications and issues"
      searchBarAccessory={<WorkspaceDropdown workspaces={workspaces} value={workspace} onChange={setWorkspaceId} />}
    >
      {!loading && (
        <List.EmptyView
          title="Inbox zero"
          description="No notifications or open issues assigned to you."
          icon={Icon.Tray}
        />
      )}
      {context && (
        <>
          <List.Section title="Notifications" subtitle={unread ? `${unread} unread` : undefined}>
            {notifications.map((item) => (
              <InboxListItem
                key={item.id}
                item={item}
                context={context}
                onChange={inbox.revalidate}
                hasUnread={unread > 0}
              />
            ))}
          </List.Section>
          <List.Section
            title="Assigned to Me"
            subtitle={assigned.pagination?.hasMore ? `${assignedCount}+` : String(assignedCount)}
          >
            {assigned.data?.map((issue) => (
              <IssueListItem key={issue.id} issue={issue} context={context} onChange={assigned.revalidate} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

async function run(action: () => Promise<unknown>, success: string, onChange: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating inbox" });
  try {
    await action();
    toast.style = Toast.Style.Success;
    toast.title = success;
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't update inbox" });
  }
}

/** Opens the issue a notification points at, marking the notification read once it loads. */
function NotificationIssue(props: { item: InboxItem; context: WorkspaceContext; onChange: () => void }) {
  const { item, context, onChange } = props;
  const {
    data: issue,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getIssue, [context.workspace.id, item.issue_id ?? ""], { onError: () => undefined });

  useEffect(() => {
    if (issue && !item.read) setInboxRead(context.workspace.id, item.id, true).then(onChange, () => undefined);
  }, [issue?.id]);

  if (issue) return <IssueDetail issue={issue} context={context} />;
  return (
    <List isLoading={isLoading} navigationTitle={item.title}>
      {error && !isLoading && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load the issue"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser url={webUrl(context.workspace, "issues", item.issue_id ?? "")} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function InboxListItem(props: {
  item: InboxItem;
  context: WorkspaceContext;
  onChange: () => void;
  hasUnread: boolean;
}) {
  const { item, context, onChange, hasUnread } = props;
  const { workspace } = context;
  const severity = INBOX_SEVERITY[item.severity] ?? INBOX_SEVERITY.info;
  const actor = actorName(item.actor_type, item.actor_id, context);
  const issueLink = item.issue_id ? webUrl(workspace, "issues", item.issue_id) : webUrl(workspace, "inbox");

  return (
    <List.Item
      title={item.title}
      subtitle={item.body ?? undefined}
      icon={
        item.read
          ? { source: Icon.Dot, tintColor: Color.SecondaryText }
          : { source: Icon.CircleFilled, tintColor: severity.color }
      }
      keywords={[item.type, actor ?? ""]}
      accessories={[
        ...(item.severity !== "info" ? [{ tag: { value: severity.name, color: severity.color } }] : []),
        ...(actor ? [{ icon: actorIcon(item.actor_type, item.actor_id, context), tooltip: actor }] : []),
        { date: new Date(item.created_at), tooltip: new Date(item.created_at).toLocaleString() },
      ]}
      actions={
        <ActionPanel title={item.title}>
          <ActionPanel.Section>
            {item.issue_id && (
              <Action.Push
                title="Show Issue"
                icon={Icon.Sidebar}
                target={<NotificationIssue item={item} context={context} onChange={onChange} />}
              />
            )}
            <Action.OpenInBrowser
              url={issueLink}
              onOpen={() => {
                if (!item.read) setInboxRead(workspace.id, item.id, true).then(onChange, () => undefined);
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={item.read ? "Mark as Unread" : "Mark as Read"}
              icon={item.read ? Icon.Circle : Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() =>
                run(
                  () => setInboxRead(workspace.id, item.id, !item.read),
                  item.read ? "Marked as unread" : "Marked as read",
                  onChange,
                )
              }
            />
            <Action
              title="Archive"
              icon={Icon.Tray}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => run(() => archiveInboxItem(workspace.id, item.id), "Archived", onChange)}
            />
            {hasUnread && (
              <Action
                title="Mark All as Read"
                icon={Icon.CheckList}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "r" }}
                onAction={() => run(() => markAllInboxRead(workspace.id), "Marked all as read", onChange)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onChange}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { RequireGh } from "./components/require-gh";
import { SetupRequired } from "./components/setup-required";
import { PRDetailView } from "./components/pr-detail";
import { ReviewThreads } from "./components/review-threads";
import { NotificationSettingsView } from "./components/settings/notifications";
import { Timeline } from "./components/timeline";
import { useViewer } from "./hooks";
import {
  clearActivity,
  getLastRun,
  loadActivity,
  markActivityRead,
  markAllActivityRead,
  unreadCount,
  type ActivityEvent,
} from "./lib/activity";
import type { ActivityKind } from "./lib/config";
import { absoluteTime, avatar, dayKey, relativeTime } from "./lib/format";
import { statusFromError } from "./lib/gh-status";
import { pullRequestDetail } from "./lib/github";
import type { Comment, PRDetail, PullRequest } from "./lib/types";

/** How each activity kind is presented in the inbox. */
const KIND_META: Record<ActivityKind, { title: string; icon: Icon; color: Color }> = {
  "review-requested": { title: "Needs my review", icon: Icon.Eye, color: Color.Red },
  "awaiting-reply": { title: "Awaiting my reply", icon: Icon.Reply, color: Color.Blue },
  "my-pr-activity": { title: "On my pull requests", icon: Icon.Person, color: Color.Green },
  watching: { title: "Watched repositories", icon: Icon.Binoculars, color: Color.Purple },
};

const FILTERS = [
  { value: "unread", title: "Unread" },
  { value: "all", title: "Everything" },
  ...Object.entries(KIND_META).map(([value, meta]) => ({ value, title: meta.title })),
];

/**
 * Rebuilds a minimal PullRequest from an inbox entry, so the shared PR views
 * (detail, threads, timeline) can be opened straight from here. The fields the
 * inbox doesn't carry are filled with neutral values; each of those views
 * re-fetches the real data on open.
 */
function toPullRequest(event: ActivityEvent): PullRequest {
  return {
    number: event.number,
    title: event.title,
    url: event.url,
    isDraft: false,
    createdAt: event.at,
    updatedAt: event.at,
    repository: event.repository,
    author: event.actor,
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    reviewDecision: "",
    labels: [],
    assignees: [],
    reviewers: [],
    comments: 0,
    threads: 0,
    unresolved: 0,
    awaitingReply: 0,
    latestReplier: event.actor,
    awaitingUrl: event.commentUrl ?? "",
    awaitingSince: event.at,
    lastActivity: event.at,
    newSince: false,
  };
}

/** A conversation comment or inline reply, flattened for the preview pane. */
type Message = Comment & { path?: string; resolved?: boolean };

/** The most recent messages on a PR, newest first — conversation and inline threads together. */
function recentMessages(detail: PRDetail, limit = 8): Message[] {
  const messages: Message[] = [
    ...detail.comments,
    ...detail.reviews.filter((r) => r.body).map((r) => ({ author: r.author, body: r.body, createdAt: r.createdAt })),
    ...detail.threads.flatMap((thread) =>
      thread.comments.map((c) => ({ ...c, path: thread.path, resolved: thread.resolved })),
    ),
  ];
  return messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

/**
 * The right-hand pane: the actual comments behind the notification, so you can
 * read what was said without opening GitHub.
 */
function EventDetail({ event }: { event: ActivityEvent }) {
  const [owner, name] = event.repository.split("/");
  const { data, isLoading } = useCachedPromise(
    (o: string, n: string, num: number) => pullRequestDetail(o, n, num),
    [owner, name, event.number],
    { keepPreviousData: true },
  );

  const lines = [`## ${event.title}`, "", `${event.repository} #${event.number} — ${event.summary}`, ""];

  if (isLoading && !data) {
    lines.push("---", "", "_Loading the conversation…_");
  } else if (data) {
    const messages = recentMessages(data);
    if (messages.length === 0) {
      lines.push("---", "", "_No comments on this pull request yet._");
    } else {
      lines.push("---", "", "### Latest comments", "");
      for (const message of messages) {
        const where = message.path ? ` · \`${message.path}\`` : "";
        const state = message.resolved ? " · resolved" : "";
        lines.push(`**@${message.author || "ghost"}** · ${relativeTime(message.createdAt)} ago${where}${state}`, "");
        lines.push(
          (message.body || "_(no text)_")
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n"),
          "",
        );
      }
    }
  }

  const unresolved = data?.threads.filter((t) => !t.resolved).length ?? 0;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={lines.join("\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Trigger"
            text={KIND_META[event.kind].title}
            icon={{ source: KIND_META[event.kind].icon, tintColor: KIND_META[event.kind].color }}
          />
          <List.Item.Detail.Metadata.Label
            title="Actor"
            text={event.actor ? `@${event.actor}` : "unknown"}
            icon={event.actor ? avatar(event.actor) : Icon.Person}
          />
          <List.Item.Detail.Metadata.Label title="When" text={absoluteTime(event.at)} />
          {data ? (
            <List.Item.Detail.Metadata.Label
              title="Conversation"
              text={`${data.comments.length} comments · ${unresolved} unresolved threads`}
            />
          ) : null}
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={event.read ? "Read" : "Unread"}
              color={event.read ? Color.SecondaryText : Color.Orange}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={event.notified ? "Banner shown" : "Silent"}
              color={event.notified ? Color.Blue : Color.SecondaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="On GitHub"
            target={event.url}
            text={`${event.repository}#${event.number}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  return (
    <RequireGh>
      <ActivityInbox />
    </RequireGh>
  );
}

function ActivityInbox() {
  const [filter, setFilter] = useState("unread");
  const [selectedId, setSelectedId] = useState<string>();

  const { error: viewerError, revalidate: revalidateViewer } = useViewer();
  const {
    data: events,
    isLoading,
    revalidate,
  } = useCachedPromise(loadActivity, [], { initialData: [] as ActivityEvent[], keepPreviousData: true });
  const { data: lastRun } = useCachedPromise(getLastRun, [], { keepPreviousData: true });

  if (viewerError) {
    return <SetupRequired status={statusFromError(viewerError)} onRecheck={revalidateViewer} />;
  }

  const unread = unreadCount(events);
  const visible = events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "unread") return !e.read;
    return e.kind === filter;
  });

  // Group by calendar day, the same way the timeline does.
  const groups: { day: string; events: ActivityEvent[] }[] = [];
  for (const event of visible) {
    const day = dayKey(event.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }

  async function open(event: ActivityEvent) {
    await markActivityRead([event.id]);
    revalidate();
  }

  async function checkNow() {
    await launchCommand({ name: "watch", type: LaunchType.Background });
    await showToast({ style: Toast.Style.Success, title: "Checking GitHub…", message: "Refresh in a few seconds" });
  }

  async function clearAll() {
    const confirmed = await confirmAlert({
      title: "Clear the Activity Inbox?",
      message: "Every recorded event is removed. Notifications keep working — this only empties the list.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await clearActivity();
      revalidate();
    }
  }

  const sharedActions = (
    <>
      <Action icon={Icon.ArrowClockwise} title="Check GitHub Now" onAction={checkNow} />
      <Action.Push
        icon={Icon.Bell}
        title="Notification Settings"
        target={<NotificationSettingsView />}
        onPop={revalidate}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={visible.length > 0}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      navigationTitle={unread > 0 ? `Activity Inbox · ${unread} unread` : "Activity Inbox"}
      searchBarPlaceholder="Search recent activity…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" storeValue onChange={setFilter}>
          {FILTERS.map((f) => (
            <List.Dropdown.Item key={f.value} value={f.value} title={f.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Tray}
        title={filter === "unread" && events.length > 0 ? "Nothing unread" : "Nothing here yet"}
        description={
          events.length > 0
            ? "Switch the dropdown to “Everything” to see earlier activity."
            : lastRun
              ? `The watcher last checked ${relativeTime(lastRun)} ago and found nothing new.`
              : "The background watcher fills this in. Run “Check GitHub Now” to prime it — the first run only records a baseline."
        }
        actions={<ActionPanel>{sharedActions}</ActionPanel>}
      />

      {groups.map((group) => (
        <List.Section key={group.day} title={group.day} subtitle={`${group.events.length}`}>
          {group.events.map((event) => {
            const meta = KIND_META[event.kind];
            const pr = toPullRequest(event);
            return (
              <List.Item
                key={event.id}
                id={event.id}
                icon={{ source: meta.icon, tintColor: meta.color }}
                title={event.title}
                subtitle={event.summary}
                keywords={[event.repository, event.actor, `#${event.number}`, meta.title]}
                accessories={[
                  ...(event.read ? [] : [{ tag: { value: "unread", color: Color.Orange } }]),
                  { text: `${event.repository} #${event.number}` },
                  ...(event.actor ? [{ icon: avatar(event.actor), tooltip: `@${event.actor}` }] : []),
                  { text: relativeTime(event.at), tooltip: absoluteTime(event.at) },
                ]}
                detail={<EventDetail event={event} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {event.commentUrl ? (
                        <Action.OpenInBrowser
                          icon={Icon.Reply}
                          title="Open the Comment"
                          url={event.commentUrl}
                          onOpen={() => open(event)}
                        />
                      ) : null}
                      <Action.OpenInBrowser
                        title={event.commentUrl ? "Open Pull Request" : "Open in Browser"}
                        url={event.url}
                        onOpen={() => open(event)}
                      />
                      <Action.Push
                        icon={Icon.Sidebar}
                        title="Show Pull Request"
                        target={<PRDetailView pr={pr} />}
                        onPush={() => open(event)}
                      />
                      <Action.Push
                        icon={Icon.SpeechBubbleActive}
                        title="Review Threads"
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        target={<ReviewThreads pr={pr} />}
                        onPush={() => open(event)}
                      />
                      <Action.Push
                        icon={Icon.Clock}
                        title="Timeline"
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        target={<Timeline pr={pr} />}
                        onPush={() => open(event)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action
                        icon={Icon.Checkmark}
                        title={event.read ? "Already Read" : "Mark as Read"}
                        shortcut={{ modifiers: ["cmd"], key: "m" }}
                        onAction={() => open(event)}
                      />
                      <Action
                        icon={Icon.CheckList}
                        title="Mark All as Read"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                        onAction={async () => {
                          await markAllActivityRead();
                          revalidate();
                        }}
                      />
                      <Action.CopyToClipboard title="Copy URL" content={event.url} />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      {sharedActions}
                      <Action
                        icon={Icon.Trash}
                        title="Clear Inbox"
                        style={Action.Style.Destructive}
                        onAction={clearAll}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

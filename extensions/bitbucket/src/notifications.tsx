import {
  Color,
  getPreferenceValues,
  Icon,
  LocalStorage,
  MenuBarExtra,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getCurrentUserUuid, getMyOpenPullRequests, getNotificationEvents, NotificationEventKind } from "./queries";
import { preferences } from "./helpers/preferences";

type Kind = "review_requested" | "changes_requested" | "approved" | NotificationEventKind;

interface PullRequestNotification {
  key: string;
  kind: Kind;
  title: string;
  subtitle: string;
  url: string;
  createdOn?: string;
}

const DISMISSED_KEY = `notifications-dismissed:${preferences.workspace}:${preferences.email}`;

const KIND_ICON: Record<Kind, { source: Icon; tintColor: Color }> = {
  review_requested: { source: Icon.Eye, tintColor: Color.Blue },
  changes_requested: { source: Icon.ExclamationMark, tintColor: Color.Orange },
  approved: { source: Icon.CheckCircle, tintColor: Color.Green },
  comment: { source: Icon.Bubble, tintColor: Color.Purple },
  mention: { source: Icon.AtSymbol, tintColor: Color.Magenta },
  pr_merged: { source: Icon.Checkmark, tintColor: Color.Green },
  pr_declined: { source: Icon.XMarkCircle, tintColor: Color.Red },
  pipeline_failed: { source: Icon.Warning, tintColor: Color.Red },
};

async function loadDismissed(): Promise<string[]> {
  try {
    return JSON.parse((await LocalStorage.getItem<string>(DISMISSED_KEY)) ?? "[]");
  } catch {
    return [];
  }
}

async function fetchNotifications(): Promise<{ notifications: PullRequestNotification[]; dismissed: string[] }> {
  const [myUuid, { values }, events, dismissed] = await Promise.all([
    getCurrentUserUuid(),
    getMyOpenPullRequests(),
    getNotificationEvents(),
    loadDismissed(),
  ]);

  const notifications: PullRequestNotification[] = [];
  for (const pr of values) {
    const repo = pr.destination.repository;
    const url = `https://bitbucket.org/${repo.full_name}/pull-requests/${pr.id}`;
    const base = `${repo.full_name}#${pr.id}`;
    const subtitle = repo.name;

    if (pr.author.uuid === myUuid) {
      for (const reviewer of pr.reviewers) {
        if (reviewer.uuid === myUuid) continue;
        notifications.push({
          key: `${base}:${reviewer.state}:${reviewer.uuid ?? reviewer.nickname}`,
          kind: reviewer.state,
          title: `${reviewer.nickname} ${reviewer.state === "approved" ? "approved" : "requested changes on"} "${pr.title}"`,
          subtitle,
          url,
        });
      }
    } else if (pr.pendingReviewerUuids.includes(myUuid)) {
      notifications.push({
        key: `${base}:review_requested`,
        kind: "review_requested",
        title: `${pr.author.nickname} requested your review on "${pr.title}"`,
        subtitle,
        url,
      });
    }
  }

  for (const event of events.values) {
    notifications.push({
      key: event.id,
      kind: event.kind,
      title: event.title,
      subtitle: event.repoName,
      url: event.url,
      createdOn: event.created_on,
    });
  }

  // Newest activity first; PR-state notifications have no timestamp and stay on top.
  notifications.sort((a, b) => (b.createdOn ?? "9").localeCompare(a.createdOn ?? "9"));

  return { notifications, dismissed };
}

export default function Command() {
  const { alwaysShow, showCount } = getPreferenceValues<Preferences.Notifications>();
  const { data, isLoading, error, mutate } = useCachedPromise(fetchNotifications);

  const dismissedSet = new Set(data?.dismissed ?? []);
  const unread = (data?.notifications ?? []).filter((n) => !dismissedSet.has(n.key));

  async function dismiss(keys: string[]) {
    const current = await loadDismissed();
    // Keep only keys that are still relevant so the list doesn't grow forever.
    const live = new Set((data?.notifications ?? []).map((n) => n.key));
    const next = [...new Set([...current, ...keys])].filter((k) => live.has(k));
    await mutate(LocalStorage.setItem(DISMISSED_KEY, JSON.stringify(next)), {
      optimisticUpdate: (prev) => (prev ? { ...prev, dismissed: next } : prev),
      shouldRevalidateAfter: false,
    });
  }

  if (!isLoading && !error && unread.length === 0 && !alwaysShow) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={{ source: "bitbucket-logo.png" }}
      title={showCount && unread.length > 0 ? String(unread.length) : undefined}
      isLoading={isLoading}
      tooltip="Bitbucket Notifications"
    >
      {error ? (
        <MenuBarExtra.Item title="Failed to load notifications" subtitle={error.message} icon={Icon.Warning} />
      ) : unread.length === 0 ? (
        <MenuBarExtra.Item title="No new notifications" />
      ) : (
        <MenuBarExtra.Section>
          {unread.map((n) => (
            <MenuBarExtra.Item
              key={n.key}
              icon={KIND_ICON[n.kind]}
              title={n.title}
              subtitle={n.subtitle}
              onAction={async () => {
                await dismiss([n.key]);
                await open(n.url);
              }}
              alternate={
                <MenuBarExtra.Item
                  icon={Icon.Checkmark}
                  title={`Mark as Read: ${n.title}`}
                  onAction={() => dismiss([n.key])}
                />
              }
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        {unread.length > 0 && (
          <MenuBarExtra.Item
            title="Mark All as Read"
            icon={Icon.Checkmark}
            onAction={() => dismiss(unread.map((n) => n.key))}
          />
        )}
        <MenuBarExtra.Item
          title="Open Bitbucket Pull Requests"
          icon={Icon.Globe}
          onAction={() => open(`https://bitbucket.org/${preferences.workspace}/workspace/pull-requests`)}
        />
        <MenuBarExtra.Item title="Configure Command" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

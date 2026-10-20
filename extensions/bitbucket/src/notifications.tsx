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
import {
  getCurrentUserUuid,
  getMyOpenPullRequests,
  getNotificationEvents,
  NOTIFICATION_LOOKBACK_DAYS,
  NotificationEventKind,
} from "./queries";
import { API_TOKEN_URL, getAuthErrorHelp, REQUIRED_SCOPES } from "./helpers/authError";
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

const MAX_MENU_ITEMS = 20;

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

interface NotificationsData {
  notifications: PullRequestNotification[];
  dismissed: string[];
  failedRepoCount: number;
}

async function fetchNotifications(): Promise<NotificationsData> {
  const [myUuid, pullRequests, events, savedDismissed] = await Promise.all([
    getCurrentUserUuid(),
    getMyOpenPullRequests(),
    getNotificationEvents(),
    loadDismissed(),
  ]);

  const notifications: PullRequestNotification[] = [];
  const windowStart = Date.now() - NOTIFICATION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  for (const pr of pullRequests.values) {
    // Old PRs (e.g. ones you were auto-added to as a default reviewer) would otherwise flood the menu.
    if (pr.updated_on && Date.parse(pr.updated_on) < windowStart) continue;
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

  const failedRepoCount = pullRequests.failedRepoCount + events.failedRepoCount;

  // Forget read keys whose notification is gone, but only after a complete scan: with
  // failed repos their keys are merely missing, and dropping them would resurface them.
  let dismissed = savedDismissed;
  if (failedRepoCount === 0) {
    // Re-read storage: the user may have marked something as read while the scan was running.
    const live = new Set(notifications.map((n) => n.key));
    const current = await loadDismissed();
    dismissed = current.filter((key) => live.has(key));
    if (dismissed.length !== current.length) {
      await LocalStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
  }

  return { notifications, dismissed, failedRepoCount };
}

export default function Command() {
  const { alwaysShow, showCount } = getPreferenceValues<Preferences.Notifications>();
  const { data, isLoading, error, mutate } = useCachedPromise(fetchNotifications);

  const authHelp = error ? getAuthErrorHelp(error) : undefined;
  const dismissedSet = new Set(data?.dismissed ?? []);
  const unread = (data?.notifications ?? []).filter((n) => !dismissedSet.has(n.key));

  async function dismiss(keys: string[]) {
    const next = [...new Set([...(await loadDismissed()), ...keys])];
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
      icon={{ source: "bitbucket-menu-bar.png", tintColor: Color.PrimaryText }}
      title={showCount && unread.length > 0 ? String(unread.length) : undefined}
      isLoading={isLoading}
      tooltip="Bitbucket Notifications"
    >
      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={authHelp?.title ?? "Failed to load notifications"}
            subtitle={authHelp ? undefined : error.message}
            icon={Icon.Warning}
          />
          {authHelp && <MenuBarExtra.Item title={authHelp.message} />}
          {authHelp && (
            <MenuBarExtra.Item
              title="Create API Token"
              icon={Icon.Key}
              tooltip={`Required scopes: ${REQUIRED_SCOPES.join(", ")}`}
              onAction={() => open(API_TOKEN_URL)}
            />
          )}
        </MenuBarExtra.Section>
      ) : unread.length === 0 ? (
        <MenuBarExtra.Item title="No new notifications" />
      ) : (
        <MenuBarExtra.Section>
          {unread.slice(0, MAX_MENU_ITEMS).map((n) => (
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
          {unread.length > MAX_MENU_ITEMS && (
            <MenuBarExtra.Item title={`…and ${unread.length - MAX_MENU_ITEMS} more`} />
          )}
        </MenuBarExtra.Section>
      )}
      {!error && data && data.failedRepoCount > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Some repositories failed to load"
            subtitle="Notifications may be incomplete"
            icon={Icon.Warning}
          />
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

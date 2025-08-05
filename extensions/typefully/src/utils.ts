import { Color, environment, Image, Keyboard } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ActivityNotification,
  AutoPlugPublishedPayload,
  AutoRetweetPublishedPayload,
  Draft,
  DraftPublishedPayload,
  InboxNotification,
  NewCommentPayload,
  NewReplyPayload,
  Notification,
  NotificationPayload,
  NotificationsResponse,
  ScheduledDraftPublishedPayload,
} from "./types";

dayjs.extend(relativeTime);

export function getRelativeDate(draft: Draft) {
  if (draft.published_on) {
    return dayjs().to(draft.published_on);
  } else if (draft.scheduled_date) {
    return dayjs().to(draft.scheduled_date);
  } else {
    return undefined;
  }
}

export function getTypefullyIcon(tinted = false) {
  const overrideTintColor = tinted ? Color.Blue : undefined;
  return {
    source: "black-feather.svg",
    tintColor: overrideTintColor ? overrideTintColor : { light: "#000000", dark: "#FFFFFF" },
  };
}

export function getMenuBarExtraTitle(inbox?: InboxNotification[], scheduledDrafts?: Draft[]) {
  let title = "";

  if (inbox && inbox.length > 0) {
    title += inbox.length.toString();
  }

  if (scheduledDrafts && scheduledDrafts.length > 0) {
    if (title.length > 0) {
      title += " | ";
    }
    title += scheduledDrafts.length.toString();
  }

  return title ? title : undefined;
}

export function getMenuBarExtraItemDraftTitle(draft: Draft) {
  const firstLine = draft.text_first_tweet.split("\n")[0];
  if (!firstLine) {
    return "Untitled draft";
  }

  if (firstLine.length <= 50) {
    return firstLine;
  }

  return firstLine.slice(0, 50) + "...";
}

export function getMenuBarExtraNotificationKey(notification: Notification) {
  return `${notification.kind}-${notification.id || notification.created_at}`;
}

export function getMenuBarExtraItemIcon(notification: Notification) {
  return { source: notification.account.profile_image_url, mask: Image.Mask.Circle };
}

export function getMenuBarExtraItemNotificationTitle(notification: Notification) {
  let firstLine: string | undefined = undefined;

  if (isNewCommentPayload(notification.payload)) {
    firstLine = notification.payload.comment_text.split("\n")[0];
  } else if (isNewReplyayload(notification.payload)) {
    firstLine = notification.payload.reply_text.split("\n")[0];
  } else if (isAutoRetweetPublishedPayload(notification.payload)) {
    firstLine = notification.payload.first_tweet_text.split("\n")[0];
  } else if (isAutoPlugPublishedPayload(notification.payload)) {
    firstLine = notification.payload.first_tweet_text.split("\n")[0];
  } else if (isDraftPublishedPayload(notification.payload)) {
    firstLine = notification.payload.success
      ? notification.payload.first_tweet_text.split("\n")[0]
      : "Failed publishing tweet";
  } else if (isScheduledDraftPublishedPayload(notification.payload)) {
    firstLine = notification.payload.success
      ? notification.payload.first_tweet_text.split("\n")[0]
      : "Failed publishing tweet";
  } else {
    console.warn("Unknown notification payload type");
  }

  if (!firstLine) {
    return "Untitled draft";
  }

  if (firstLine.length <= 50) {
    return firstLine;
  }

  return firstLine.slice(0, 50) + "...";
}

export function getMenuBarExtraItemNotificationSubtitle(notification: Notification) {
  return dayjs().to(notification.created_at);
}

export function getMenuBarItemNotificationTooltip(notification: Notification) {
  if (isNewCommentPayload(notification.payload)) {
    return notification.payload.comment_text;
  } else if (isNewReplyayload(notification.payload)) {
    return notification.payload.reply_text;
  } else if (isAutoRetweetPublishedPayload(notification.payload)) {
    return notification.payload.first_tweet_text;
  } else if (isAutoPlugPublishedPayload(notification.payload)) {
    return notification.payload.first_tweet_text;
  } else if (isDraftPublishedPayload(notification.payload)) {
    return notification.payload.success ? notification.payload.first_tweet_text : undefined;
  } else if (isScheduledDraftPublishedPayload(notification.payload)) {
    return notification.payload.success ? notification.payload.first_tweet_text : undefined;
  }
}

export function getFlattenInboxNotifications(response?: NotificationsResponse) {
  return Object.entries(response?.notifications ?? {}).reduce((acc, curr) => {
    return [...acc, ...curr[1].inbox];
  }, [] as InboxNotification[]);
}

export function getFlattenAcivityNotifications(response?: NotificationsResponse) {
  return Object.entries(response?.notifications ?? {}).reduce((acc, curr) => {
    return [...acc, ...curr[1].activity];
  }, [] as ActivityNotification[]);
}

export function getMenuBarExtraItemShortcut(index: number, modifiers: Keyboard.KeyModifier[] = ["cmd"]) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers, key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}

// Sorting

export function sortByScheduled(a: Draft, b: Draft) {
  return new Date(a.scheduled_date ?? "").getTime() - new Date(b.scheduled_date ?? "").getTime();
}

export function sortByPublished(a: Draft, b: Draft) {
  return new Date(b.published_on ?? "").getTime() - new Date(a.published_on ?? "").getTime();
}

export function sortByCreated(a: Notification, b: Notification) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

// Type guards

export function isInboxNotification(notification: Notification): notification is InboxNotification {
  return notification.kind === "inbox";
}

export function isActivityNotification(notification: Notification): notification is ActivityNotification {
  return notification.kind === "activity";
}

export function isNewCommentPayload(payload: NotificationPayload): payload is NewCommentPayload {
  return payload.action === "new_comment";
}

export function isNewReplyayload(payload: NotificationPayload): payload is NewReplyPayload {
  return payload.action === "new_reply";
}

export function isAutoPlugPublishedPayload(payload: NotificationPayload): payload is AutoPlugPublishedPayload {
  return payload.action === "auto_plug_published";
}

export function isAutoRetweetPublishedPayload(payload: NotificationPayload): payload is AutoRetweetPublishedPayload {
  return payload.action === "auto_retweet_published";
}

export function isDraftPublishedPayload(payload: NotificationPayload): payload is DraftPublishedPayload {
  return payload.action === "draft_published";
}

export function isScheduledDraftPublishedPayload(
  payload: NotificationPayload
): payload is ScheduledDraftPublishedPayload {
  return payload.action === "scheduled_draft_published";
}

export function getIcon(index: number): Image.ImageLike {
  const fill = environment.theme === "dark" ? "#56C2FF" : "#138AF2";
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="${fill}" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${index}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}

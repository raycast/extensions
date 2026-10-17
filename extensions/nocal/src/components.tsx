import { Action, ActionPanel, Color, Icon, List, Toast, open, openExtensionPreferences, showToast } from "@raycast/api";
import { isApiError } from "./api";
import { connectNocalAccount, isOAuthCancellation } from "./oauth";

export function ErrorState(props: { title: string; error: unknown; onRetry?: () => void }) {
  return (
    <List.EmptyView
      title={props.title}
      description={getErrorMessage(props.error)}
      actions={
        <ActionPanel>
          <Action title="Connect Nocal Account" onAction={connectNocalAccount} />
          {props.onRetry ? <Action title="Retry" onAction={props.onRetry} /> : null}
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

export function formatDateTime(value: string, isAllDay: boolean) {
  const date = new Date(value);

  if (isAllDay) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function relativeDayLabel(date: Date, now: Date): string {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((dateStart.getTime() - todayStart.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  }
  if (diffDays >= 7 && diffDays < 14) {
    return "Next " + new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRelativeEventTime(value: string, isAllDay: boolean): string {
  const date = new Date(value);
  const now = new Date();
  const label = relativeDayLabel(date, now);

  if (isAllDay) return label;

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${label} @ ${time}`;
}

export function getMeetingAccessories(
  startTime: string,
  isAllDay: boolean,
  icon?: List.Item.Accessory["icon"],
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [{ text: formatRelativeEventTime(startTime, isAllDay) }];

  if (icon) {
    accessories.push({ icon });
  }

  return accessories;
}

export function formatRsvpStatus(status: string) {
  switch (status.toUpperCase()) {
    case "ACCEPTED":
      return "Going";
    case "DECLINED":
      return "Declined";
    case "TENTATIVE":
      return "Tentative";
    case "NEEDS_ACTION":
      return "Needs RSVP";
    default:
      return status;
  }
}

export function getSelfRsvpStatus(attendees: Array<{ is_self: boolean; rsvp_status: string }>) {
  return attendees.find((attendee) => attendee.is_self)?.rsvp_status ?? null;
}

export function noteSnippetMarkdown(snippet: string | null | undefined) {
  if (!snippet) {
    return "No preview available.";
  }

  return snippet.replace(/<[^>]+>/g, "").trim();
}

export async function showApiSuccess(title: string, message: string) {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

export async function openNocalDeepLink(path: string) {
  await open(`nocal://raycast/${path}`);
}

export function getErrorMessage(error: unknown) {
  if (isOAuthCancellation(error)) {
    return "Connection canceled. Connect your nocal account again when you are ready.";
  }

  if (isApiError(error)) {
    if (error.status === 401 || error.status === 403) {
      return "Your nocal session expired or access was revoked. Connect your account again.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export function statusIcon(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "confirmed") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }

  if (normalizedStatus === "cancelled") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }

  return Icon.Calendar;
}

export function meetingIcon(rsvpStatus: string | null, status: string) {
  if (rsvpStatus) {
    switch (rsvpStatus.toUpperCase()) {
      case "ACCEPTED":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "DECLINED":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "TENTATIVE":
        return { source: Icon.MinusCircle, tintColor: Color.Orange };
      case "NEEDS_ACTION":
        return { source: Icon.QuestionMarkCircle, tintColor: Color.Yellow };
      default:
        break;
    }
  }

  return statusIcon(status);
}

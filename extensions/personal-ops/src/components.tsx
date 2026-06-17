import { Action, ActionPanel, Color, getApplications, Icon, List, open, showToast, Toast } from "@raycast/api";
import { CalendarEvent, formatWhen, LinearIssue, respondToCalendarEvent } from "./api";

export function EventActions({ event, onRespond }: { event: CalendarEvent; onRespond?: () => void | Promise<void> }) {
  const canRespond = Boolean(event.responseStatus);
  return (
    <ActionPanel>
      {canRespond ? <Action title="Accept Meeting" icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} onAction={() => respond(event, "accepted", onRespond)} /> : null}
      {canRespond ? <Action title="Maybe" icon={{ source: Icon.CircleProgress50, tintColor: Color.Yellow }} onAction={() => respond(event, "tentative", onRespond)} /> : null}
      {canRespond ? <Action title="Decline Meeting" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={() => respond(event, "declined", onRespond)} /> : null}
      {event.htmlLink ? <Action.OpenInBrowser title="Open in Google Calendar" url={event.htmlLink} /> : null}
      <Action.CopyToClipboard title="Copy Event ID" content={event.id} />
    </ActionPanel>
  );
}

export function CalendarItem({ event, onRespond }: { event: CalendarEvent; onRespond?: () => void | Promise<void> }) {
  const needsAction = event.responseStatus && event.responseStatus !== "accepted";
  return (
    <List.Item
      title={event.title}
      subtitle={formatWhen(event.start, event.end)}
      icon={{ source: needsAction ? Icon.ExclamationMark : Icon.Calendar, tintColor: needsAction ? Color.Orange : Color.Blue }}
      detail={
        <List.Item.Detail
          markdown={eventDetailMarkdown(event)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="When" text={formatWhen(event.start, event.end)} />
              {event.responseStatus ? <List.Item.Detail.Metadata.Label title="Status" text={{ value: event.responseStatus, color: statusColor(event.responseStatus) }} /> : null}
              {event.location ? <List.Item.Detail.Metadata.Label title="Location" text={event.location} icon={Icon.Pin} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<EventActions event={event} onRespond={onRespond} />}
    />
  );
}

export function LinearIssueItem({ issue }: { issue: LinearIssue }) {
  const markdown = issueDetailMarkdown(issue);
  return (
    <List.Item
      title={`${issue.identifier}: ${issue.title}`}
      subtitle={issue.state?.name || "Unknown state"}
      icon={{ source: Icon.Ticket, tintColor: issue.priority <= 1 ? Color.Red : Color.Purple }}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="State" text={issue.state?.name || "Unknown"} />
              {issue.priorityLabel ? <List.Item.Detail.Metadata.Label title="Priority" text={{ value: issue.priorityLabel, color: issue.priority <= 1 ? Color.Red : Color.SecondaryText }} /> : null}
              {issue.dueDate ? <List.Item.Detail.Metadata.Label title="Due" text={issue.dueDate} icon={Icon.Clock} /> : null}
              <List.Item.Detail.Metadata.Label title="Linear" text={issue.identifier} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title="Open in Linear" icon={Icon.Ticket} onAction={() => openLinearIssue(issue.url)} />
          <Action.CopyToClipboard title="Copy Issue ID" content={issue.identifier} />
          <Action.CopyToClipboard title="Copy Issue URL" content={issue.url} />
        </ActionPanel>
      }
    />
  );
}

function eventDetailMarkdown(event: CalendarEvent) {
  return [
    `# ${escapeMarkdown(event.title)}`,
    `**When:** ${formatWhen(event.start, event.end) || "Unknown"}`,
    event.responseStatus ? `**Status:** ${event.responseStatus}` : "",
    event.location ? `**Location:** ${escapeMarkdown(event.location)}` : "",
    event.htmlLink ? `[Open in Google Calendar](${event.htmlLink})` : "",
  ].filter(Boolean).join("\n\n");
}

function issueDetailMarkdown(issue: LinearIssue) {
  return [
    `# ${issue.identifier}: ${escapeMarkdown(issue.title)}`,
    `**State:** ${issue.state?.name || "Unknown"}`,
    issue.priorityLabel ? `**Priority:** ${issue.priorityLabel}` : "",
    issue.dueDate ? `**Due:** ${issue.dueDate}` : "",
    "Use the action menu to open this issue in Linear.",
  ].filter(Boolean).join("\n\n");
}

async function openLinearIssue(url: string) {
  try {
    const applications = await getApplications();
    const linear = applications.find((application) => application.bundleId === "com.linear" || application.name === "Linear");
    if (linear) {
      await open(url, linear);
      return;
    }
  } catch {
    // Fall back to the default URL handler below.
  }

  await open(url);
}

async function respond(event: CalendarEvent, status: "accepted" | "declined" | "tentative", onRespond?: () => void | Promise<void>) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${event.title}` });
  try {
    await respondToCalendarEvent(event.id, status);
    toast.style = Toast.Style.Success;
    toast.title = status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : "Marked maybe";
    toast.message = event.title;
    await onRespond?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not update meeting";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function statusColor(status: string) {
  if (status === "accepted") return Color.Green;
  if (status === "declined") return Color.Red;
  if (status === "tentative") return Color.Yellow;
  return Color.Orange;
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

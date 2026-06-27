import { List, Icon, Color, ActionPanel, Action, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getWorkflowHistory, showConnectionError } from "../lib/temporal-client";
import { HistoryEvent } from "../lib/types";
import { formatDuration } from "../lib/utils";

interface WorkflowHistoryProps {
  workflowId: string;
  runId?: string;
}

export default function WorkflowHistory({ workflowId, runId }: WorkflowHistoryProps) {
  const {
    data: events,
    isLoading,
    error,
  } = useCachedPromise(
    async (wfId: string, rId?: string) => {
      return getWorkflowHistory(wfId, rId);
    },
    [workflowId, runId],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  const groupedEvents = groupEventsByActivity(events || []);

  return (
    <List isLoading={isLoading} navigationTitle={`History: ${workflowId}`}>
      {error && !events ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to Load History" description={error.message} />
      ) : events?.length === 0 ? (
        <List.EmptyView icon={Icon.Document} title="No History Events" description="This workflow has no history yet" />
      ) : (
        <>
          {/* Summary Section */}
          <List.Section title="Summary">
            <List.Item
              title={`${events?.length || 0} Total Events`}
              subtitle={buildSummarySubtitle(groupedEvents)}
              icon={Icon.List}
              accessories={
                groupedEvents.workflowTaskCount > 0
                  ? [
                      {
                        text: `${groupedEvents.workflowTaskCount} workflow tasks hidden`,
                        tooltip: "Workflow task events are internal Temporal bookkeeping",
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View All Events"
                    icon={Icon.List}
                    target={<AllEventsView events={events || []} />}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          {/* Activities Section */}
          {groupedEvents.activities.length > 0 && (
            <List.Section title="Activities" subtitle={String(groupedEvents.activities.length)}>
              {groupedEvents.activities.map((activity, index) => (
                <ActivityItem key={`activity-${index}`} activity={activity} />
              ))}
            </List.Section>
          )}

          {/* Timers Section */}
          {groupedEvents.timers.length > 0 && (
            <List.Section title="Timers" subtitle={String(groupedEvents.timers.length)}>
              {groupedEvents.timers.map((timer, index) => (
                <TimerItem key={`timer-${index}`} timer={timer} />
              ))}
            </List.Section>
          )}

          {/* Signals Section */}
          {groupedEvents.signals.length > 0 && (
            <List.Section title="Signals" subtitle={String(groupedEvents.signals.length)}>
              {groupedEvents.signals.map((signal, index) => (
                <EventItem key={`signal-${index}`} event={signal} icon={Icon.Message} color={Color.Purple} />
              ))}
            </List.Section>
          )}

          {/* Other Events Section */}
          {groupedEvents.other.length > 0 && (
            <List.Section title="Other Events" subtitle={String(groupedEvents.other.length)}>
              {groupedEvents.other.map((event, index) => (
                <EventItem key={`other-${index}`} event={event} icon={Icon.Circle} color={Color.SecondaryText} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

// ============================================================================
// Event Grouping
// ============================================================================

interface ActivityGroup {
  name: string;
  scheduledEvent?: HistoryEvent;
  startedEvent?: HistoryEvent;
  completedEvent?: HistoryEvent;
  failedEvent?: HistoryEvent;
  status: "scheduled" | "running" | "completed" | "failed";
  duration?: number;
}

interface TimerGroup {
  startedEvent: HistoryEvent;
  firedEvent?: HistoryEvent;
  canceledEvent?: HistoryEvent;
  status: "running" | "fired" | "canceled";
  duration?: number;
}

interface GroupedEvents {
  activities: ActivityGroup[];
  timers: TimerGroup[];
  signals: HistoryEvent[];
  other: HistoryEvent[];
  workflowTaskCount: number; // Hidden workflow task events
}

function groupEventsByActivity(events: HistoryEvent[]): GroupedEvents {
  const activities: Map<string, ActivityGroup> = new Map();
  const timers: Map<string, TimerGroup> = new Map();
  const signals: HistoryEvent[] = [];
  const other: HistoryEvent[] = [];
  let workflowTaskCount = 0;

  // First pass: create activity groups from scheduled events (they have the activity type name)
  for (const event of events) {
    const eventType = event.eventType.toLowerCase();
    if (eventType.includes("activity") && eventType.includes("scheduled")) {
      // Use eventId as the key since other events reference this via scheduledEventId
      const key = `scheduled-${event.eventId}`;
      const activityTypeName =
        (event.details?.activityTypeName as string) || (event.details?.activityType as { name?: string })?.name || null;

      activities.set(key, {
        name: activityTypeName || "Unknown Activity",
        status: "scheduled",
        scheduledEvent: event,
      });
    }
  }

  // Second pass: link started/completed/failed events to their scheduled events
  for (const event of events) {
    const eventType = event.eventType.toLowerCase();

    // Skip scheduled activity events - they were already handled in first pass
    if (eventType.includes("activity") && eventType.includes("scheduled")) {
      continue;
    }

    // Activity events (non-scheduled)
    if (eventType.includes("activity")) {
      // Use scheduledEventId to find the parent activity
      const scheduledEventId = event.details?.scheduledEventId as number | undefined;
      const key = scheduledEventId ? `scheduled-${scheduledEventId}` : `activity-${event.eventId}`;

      // If no existing group, create one (shouldn't happen normally)
      if (!activities.has(key)) {
        activities.set(key, {
          name: "Unknown Activity",
          status: "scheduled",
        });
      }

      const activity = activities.get(key)!;

      if (eventType.includes("started")) {
        activity.startedEvent = event;
        activity.status = "running";
      } else if (eventType.includes("completed")) {
        activity.completedEvent = event;
        activity.status = "completed";
        if (activity.startedEvent) {
          activity.duration = event.eventTime.getTime() - activity.startedEvent.eventTime.getTime();
        }
      } else if (eventType.includes("failed") || eventType.includes("timed")) {
        activity.failedEvent = event;
        activity.status = "failed";
      }
    }
    // Timer events
    else if (eventType.includes("timer")) {
      const timerId = (event.details?.timerId as string) || `timer-${event.eventId}`;

      if (!timers.has(timerId)) {
        timers.set(timerId, {
          startedEvent: event,
          status: "running",
        });
      }

      const timer = timers.get(timerId)!;

      if (eventType.includes("started")) {
        timer.startedEvent = event;
      } else if (eventType.includes("fired")) {
        timer.firedEvent = event;
        timer.status = "fired";
        timer.duration = event.eventTime.getTime() - timer.startedEvent.eventTime.getTime();
      } else if (eventType.includes("canceled")) {
        timer.canceledEvent = event;
        timer.status = "canceled";
      }
    }
    // Signal events
    else if (eventType.includes("signal")) {
      signals.push(event);
    }
    // Workflow lifecycle events
    else if (
      eventType.includes("workflow execution started") ||
      eventType.includes("workflow execution completed") ||
      eventType.includes("workflow task")
    ) {
      // Count workflow task events (hidden) but keep workflow execution events visible
      if (eventType.includes("workflow task")) {
        workflowTaskCount++;
      } else {
        other.push(event);
      }
    }
    // Other events
    else {
      other.push(event);
    }
  }

  // Reverse arrays to show newest first (consistent with All Events view and Temporal UI)
  return {
    activities: Array.from(activities.values()).reverse(),
    timers: Array.from(timers.values()).reverse(),
    signals: signals.reverse(),
    other: other.reverse(),
    workflowTaskCount,
  };
}

// ============================================================================
// Summary Helpers
// ============================================================================

function buildSummarySubtitle(grouped: GroupedEvents): string {
  const parts: string[] = [];
  if (grouped.activities.length > 0) {
    parts.push(`${grouped.activities.length} Activities`);
  }
  if (grouped.timers.length > 0) {
    parts.push(`${grouped.timers.length} Timers`);
  }
  if (grouped.signals.length > 0) {
    parts.push(`${grouped.signals.length} Signals`);
  }
  if (grouped.other.length > 0) {
    parts.push(`${grouped.other.length} Lifecycle`);
  }
  return parts.join(", ") || "No events";
}

// ============================================================================
// List Items
// ============================================================================

function ActivityItem({ activity }: { activity: ActivityGroup }) {
  const { icon, color } = getActivityStatusIcon(activity.status);
  const duration = activity.duration ? formatDuration(activity.duration) : undefined;

  return (
    <List.Item
      title={activity.name}
      subtitle={activity.status}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        ...(duration ? [{ text: duration, tooltip: "Duration" }] : []),
        {
          text: activity.scheduledEvent?.eventTime.toLocaleTimeString() || "",
          tooltip: "Scheduled at",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Activity Details" icon={Icon.Eye} target={<ActivityDetail activity={activity} />} />
          <Action.CopyToClipboard title="Copy Activity Name" content={activity.name} />
          {activity.scheduledEvent?.details?.input !== undefined && (
            <Action.CopyToClipboard
              title="Copy Input"
              content={formatPayload(activity.scheduledEvent.details.input)}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
          {activity.completedEvent?.details?.result !== undefined && (
            <Action.CopyToClipboard
              title="Copy Result"
              content={formatPayload(activity.completedEvent.details.result)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          {activity.failedEvent?.details && (
            <Action.CopyToClipboard
              title="Copy Failure Details"
              content={JSON.stringify(activity.failedEvent.details, null, 2)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy All Details"
            content={JSON.stringify(getActivityAllDetails(activity), null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function TimerItem({ timer }: { timer: TimerGroup }) {
  const { icon, color } = getTimerStatusIcon(timer.status);
  const duration = timer.duration ? formatDuration(timer.duration) : undefined;

  return (
    <List.Item
      title="Timer"
      subtitle={timer.status}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        ...(duration ? [{ text: duration, tooltip: "Duration" }] : []),
        { text: timer.startedEvent.eventTime.toLocaleTimeString(), tooltip: "Started at" },
      ]}
    />
  );
}

function EventItem({ event, icon, color }: { event: HistoryEvent; icon: Icon; color: Color }) {
  // Include activity name or signal name in subtitle when available
  const activityName = event.details?.activityTypeName as string | undefined;
  const signalName = event.details?.signalName as string | undefined;
  const contextName = activityName || signalName;
  const subtitle = contextName ? `${contextName} - Event #${event.eventId}` : `Event #${event.eventId}`;

  return (
    <List.Item
      title={event.eventType}
      subtitle={subtitle}
      icon={{ source: icon, tintColor: color }}
      accessories={[{ text: event.eventTime.toLocaleTimeString(), tooltip: event.eventTime.toLocaleString() }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Event Details" content={JSON.stringify(event.details, null, 2)} />
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getActivityStatusIcon(status: string): { icon: Icon; color: Color } {
  switch (status) {
    case "completed":
      return { icon: Icon.CheckCircle, color: Color.Green };
    case "running":
      return { icon: Icon.CircleProgress, color: Color.Blue };
    case "failed":
      return { icon: Icon.XMarkCircle, color: Color.Red };
    default:
      return { icon: Icon.Clock, color: Color.Orange };
  }
}

function getTimerStatusIcon(status: string): { icon: Icon; color: Color } {
  switch (status) {
    case "fired":
      return { icon: Icon.CheckCircle, color: Color.Green };
    case "canceled":
      return { icon: Icon.XMarkCircle, color: Color.Orange };
    default:
      return { icon: Icon.Clock, color: Color.Blue };
  }
}

// ============================================================================
// All Events View (Chronological)
// ============================================================================

function AllEventsView({ events }: { events: HistoryEvent[] }) {
  // Sort by eventId descending (newest first, like Temporal UI)
  const sortedEvents = [...events].sort((a, b) => b.eventId - a.eventId);

  return (
    <List navigationTitle="All Events">
      {sortedEvents.map((event) => {
        const { icon, color } = getEventIcon(event.eventType);
        const activityName = event.details?.activityTypeName as string | undefined;
        const subtitle = activityName ? `${activityName} - Event #${event.eventId}` : `Event #${event.eventId}`;

        return (
          <List.Item
            key={event.eventId}
            title={event.eventType}
            subtitle={subtitle}
            icon={{ source: icon, tintColor: color }}
            accessories={[
              {
                text: event.eventTime.toLocaleTimeString(),
                tooltip: event.eventTime.toLocaleString(),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Event Details" content={JSON.stringify(event.details, null, 2)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getEventIcon(eventType: string): { icon: Icon; color: Color } {
  const type = eventType.toLowerCase();
  if (type.includes("completed")) {
    return { icon: Icon.CheckCircle, color: Color.Green };
  }
  if (type.includes("started")) {
    return { icon: Icon.Play, color: Color.Blue };
  }
  if (type.includes("scheduled")) {
    return { icon: Icon.Clock, color: Color.Orange };
  }
  if (type.includes("failed") || type.includes("timed out")) {
    return { icon: Icon.XMarkCircle, color: Color.Red };
  }
  if (type.includes("signal")) {
    return { icon: Icon.Message, color: Color.Purple };
  }
  if (type.includes("timer")) {
    return { icon: Icon.Clock, color: Color.Yellow };
  }
  return { icon: Icon.Circle, color: Color.SecondaryText };
}

// ============================================================================
// Activity Detail View
// ============================================================================

function ActivityDetail({ activity }: { activity: ActivityGroup }) {
  const { icon, color } = getActivityStatusIcon(activity.status);
  const duration = activity.duration ? formatDuration(activity.duration) : undefined;

  // Extract input/output/failure data
  const input = activity.scheduledEvent?.details?.input;
  const result = activity.completedEvent?.details?.result;
  const failure = activity.failedEvent?.details?.failure;

  // Extract metadata
  const taskQueue = activity.scheduledEvent?.details?.taskQueue as { name?: string } | undefined;
  const attempt = activity.startedEvent?.details?.attempt as number | undefined;
  const identity = activity.startedEvent?.details?.identity as string | undefined;
  const activityId = activity.scheduledEvent?.details?.activityId as string | undefined;
  const retryPolicy = activity.scheduledEvent?.details?.retryPolicy;

  // Build markdown content
  let markdown = `# ${activity.name}\n\n`;
  markdown += `**Status:** ${activity.status}${duration ? ` (${duration})` : ""}\n\n`;

  // Timeline section
  markdown += `## Timeline\n\n`;
  markdown += `| Event | Time |\n`;
  markdown += `|-------|------|\n`;
  if (activity.scheduledEvent) {
    markdown += `| Scheduled | ${activity.scheduledEvent.eventTime.toLocaleString()} |\n`;
  }
  if (activity.startedEvent) {
    markdown += `| Started | ${activity.startedEvent.eventTime.toLocaleString()} |\n`;
  }
  if (activity.completedEvent) {
    markdown += `| Completed | ${activity.completedEvent.eventTime.toLocaleString()} |\n`;
  }
  if (activity.failedEvent) {
    markdown += `| Failed | ${activity.failedEvent.eventTime.toLocaleString()} |\n`;
  }
  markdown += `\n`;

  // Input section
  if (input) {
    markdown += `## Input\n\n`;
    markdown += "```json\n" + formatPayload(input) + "\n```\n\n";
  }

  // Result section (for completed activities)
  if (result) {
    markdown += `## Result\n\n`;
    markdown += "```json\n" + formatPayload(result) + "\n```\n\n";
  }

  // Failure section (for failed activities)
  if (failure) {
    markdown += `## Failure\n\n`;
    markdown += "```json\n" + JSON.stringify(failure, null, 2) + "\n```\n\n";
  }

  // Metadata section
  markdown += `## Details\n\n`;
  if (activityId) markdown += `- **Activity ID:** ${activityId}\n`;
  if (taskQueue?.name) markdown += `- **Task Queue:** ${taskQueue.name}\n`;
  if (attempt) markdown += `- **Attempt:** ${attempt}\n`;
  if (identity) markdown += `- **Worker:** ${identity}\n`;
  if (retryPolicy) {
    markdown += `- **Retry Policy:**\n`;
    markdown += "```json\n" + JSON.stringify(retryPolicy, null, 2) + "\n```\n";
  }

  return (
    <Detail
      navigationTitle={activity.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={activity.status} icon={{ source: icon, tintColor: color }} />
          {duration && <Detail.Metadata.Label title="Duration" text={duration} />}
          {taskQueue?.name && <Detail.Metadata.Label title="Task Queue" text={taskQueue.name} />}
          {attempt && <Detail.Metadata.Label title="Attempt" text={String(attempt)} />}
          {identity && <Detail.Metadata.Label title="Worker" text={identity} />}
          <Detail.Metadata.Separator />
          {activity.scheduledEvent && (
            <Detail.Metadata.Label title="Scheduled" text={activity.scheduledEvent.eventTime.toLocaleString()} />
          )}
          {activity.startedEvent && (
            <Detail.Metadata.Label title="Started" text={activity.startedEvent.eventTime.toLocaleString()} />
          )}
          {activity.completedEvent && (
            <Detail.Metadata.Label title="Completed" text={activity.completedEvent.eventTime.toLocaleString()} />
          )}
          {activity.failedEvent && (
            <Detail.Metadata.Label title="Failed" text={activity.failedEvent.eventTime.toLocaleString()} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Activity Name" content={activity.name} />
          {input !== undefined && (
            <Action.CopyToClipboard
              title="Copy Input"
              content={formatPayload(input)}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
          {result !== undefined && (
            <Action.CopyToClipboard
              title="Copy Result"
              content={formatPayload(result)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          {failure !== undefined && (
            <Action.CopyToClipboard
              title="Copy Failure"
              content={JSON.stringify(failure, null, 2)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy All Details"
            content={JSON.stringify(getActivityAllDetails(activity), null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Payload Helpers
// ============================================================================

/**
 * Decode a single Temporal payload item (with metadata and data fields)
 */
function decodePayloadItem(item: unknown): unknown {
  if (!item || typeof item !== "object") return item;

  const p = item as Record<string, unknown>;

  // Check if it has the Temporal payload structure with data field
  if (!("data" in p)) return item;

  try {
    const data = p.data;

    // Handle base64 string data
    if (typeof data === "string") {
      const decoded = atob(data);
      try {
        return JSON.parse(decoded);
      } catch {
        return decoded;
      }
    }

    // Handle Uint8Array or Buffer-like object
    if (data instanceof Uint8Array) {
      const decoded = new TextDecoder().decode(data);
      try {
        return JSON.parse(decoded);
      } catch {
        return decoded;
      }
    }

    // Handle object that looks like a byte array (e.g., { 0: 123, 1: 34, ... })
    if (data && typeof data === "object") {
      const values = Object.values(data as Record<string, number>);
      if (values.length > 0 && typeof values[0] === "number") {
        const bytes = new Uint8Array(values);
        const decoded = new TextDecoder().decode(bytes);
        try {
          return JSON.parse(decoded);
        } catch {
          return decoded;
        }
      }
    }
  } catch {
    // If decoding fails, return original
  }

  return item;
}

/**
 * Format a Temporal payload for display
 * Handles the standard Temporal payload structure: { payloads: [{ metadata: {...}, data: "base64..." }] }
 */
function formatPayload(payload: unknown): string {
  if (!payload) return "null";

  // Handle the standard Temporal payload wrapper: { payloads: [...] }
  if (payload && typeof payload === "object" && "payloads" in payload) {
    const wrapper = payload as { payloads: unknown[] };
    const payloads = wrapper.payloads;

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return "[]";
    }

    // Decode each payload item
    const decoded = payloads.map(decodePayloadItem);

    // If single item, unwrap for cleaner display
    if (decoded.length === 1) {
      return JSON.stringify(decoded[0], null, 2);
    }
    return JSON.stringify(decoded, null, 2);
  }

  // Handle direct array of payloads (older format or already unwrapped)
  if (Array.isArray(payload)) {
    if (payload.length === 0) return "[]";

    const decoded = payload.map(decodePayloadItem);

    if (decoded.length === 1) {
      return JSON.stringify(decoded[0], null, 2);
    }
    return JSON.stringify(decoded, null, 2);
  }

  // Fallback: just stringify whatever we got
  return JSON.stringify(payload, null, 2);
}

/**
 * Get all details from an activity for copying
 */
function getActivityAllDetails(activity: ActivityGroup): Record<string, unknown> {
  return {
    name: activity.name,
    status: activity.status,
    duration: activity.duration,
    scheduled: activity.scheduledEvent?.details,
    started: activity.startedEvent?.details,
    completed: activity.completedEvent?.details,
    failed: activity.failedEvent?.details,
  };
}

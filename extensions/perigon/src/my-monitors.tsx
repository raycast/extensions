import { useState } from "react";
import { ActionPanel, Action, Color, Detail, Icon, Image, List, useNavigation } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { listMonitorEvents, listMonitorNewsletters, listMonitors } from "./lib/perigon-api";
import { perigonOAuth } from "./lib/perigon-oauth";
import type { PerigonMonitor, PerigonMonitorEvent, PerigonMonitorNewsletter } from "./lib/types";

const MONITOR_FILTERS = ["all", "active", "paused", "draft"] as const;

type MonitorFilter = (typeof MONITOR_FILTERS)[number];
type MonitorGroup = Exclude<MonitorFilter, "all">;

const MONITOR_GROUPS: { id: MonitorGroup; title: string }[] = [
  { id: "active", title: "Active" },
  { id: "paused", title: "Paused" },
  { id: "draft", title: "Draft" },
];

const ACTIVE_CHIP_COLOR: Color.Dynamic = { light: "#178D43", dark: "#22C55E", adjustContrast: false };
const MUTED_CHIP_COLOR = Color.SecondaryText;

function MyMonitors() {
  const { push } = useNavigation();
  const [filter, setFilter] = useState<MonitorFilter>("all");

  const { data, isLoading, error, revalidate } = usePromise(listMonitors, [], {
    failureToastOptions: { title: "Could not load monitors" },
  });

  const monitors = data ?? [];
  const grouped = groupMonitors(monitors);
  const visibleGroups = filter === "all" ? MONITOR_GROUPS : MONITOR_GROUPS.filter((group) => group.id === filter);
  const visibleCount = visibleGroups.reduce((count, group) => count + grouped[group.id].length, 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter monitors…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={filter}
          onChange={(value) => {
            if (isMonitorFilter(value)) {
              setFilter(value);
            }
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item
            title="Active"
            value="active"
            icon={{ source: Icon.CircleFilled, tintColor: ACTIVE_CHIP_COLOR }}
          />
          <List.Dropdown.Item
            title="Paused"
            value="paused"
            icon={{ source: Icon.BellDisabled, tintColor: MUTED_CHIP_COLOR }}
          />
          <List.Dropdown.Item title="Draft" value="draft" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could not load monitors"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
            </ActionPanel>
          }
        />
      ) : !isLoading && monitors.length === 0 ? (
        <List.EmptyView title="No monitors" description="Create monitors in Perigon to see them here." />
      ) : !isLoading && visibleCount === 0 ? (
        <List.EmptyView title={emptyFilterTitle(filter)} description="No monitors match this status." />
      ) : (
        visibleGroups.map((group) =>
          grouped[group.id].length === 0 ? null : (
            <List.Section
              key={group.id}
              title={filter === "all" ? group.title : undefined}
              subtitle={filter === "all" ? String(grouped[group.id].length) : undefined}
            >
              {grouped[group.id].map((monitor) => (
                <MonitorListItem key={monitor.uuid} monitor={monitor} push={push} />
              ))}
            </List.Section>
          ),
        )
      )}
    </List>
  );
}

function MonitorListItem({
  monitor,
  push,
}: {
  monitor: PerigonMonitor;
  push: ReturnType<typeof useNavigation>["push"];
}) {
  return (
    <List.Item
      title={monitor.name}
      subtitle={monitor.classificationType || "Monitor"}
      icon={{ source: monitorImageUrl(monitor.uuid), mask: Image.Mask.RoundedRectangle }}
      accessories={[statusAccessory(monitor.status)]}
      keywords={[statusLabel(monitor.status), monitor.classificationType]}
      actions={
        <ActionPanel>
          <Action title="Open Output" icon={Icon.Eye} onAction={() => openMonitorOutput(monitor, push)} />
        </ActionPanel>
      }
    />
  );
}

function openMonitorOutput(monitor: PerigonMonitor, push: ReturnType<typeof useNavigation>["push"]): void {
  if (monitor.classificationType === "TOPIC") {
    push(<MonitorNewslettersView monitor={monitor} />);
    return;
  }
  if (monitor.classificationType === "EVENT" || monitor.classificationType === "MENTIONS") {
    push(<MonitorEventsView monitor={monitor} />);
    return;
  }
  push(<MonitorUnsupportedView monitor={monitor} />);
}

function MonitorEventsView({ monitor }: { monitor: PerigonMonitor }) {
  const { data, isLoading, error, revalidate } = usePromise(listMonitorEvents, [monitor.uuid], {
    failureToastOptions: { title: "Could not load events" },
  });

  const events = data ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={monitor.name} searchBarPlaceholder="Filter events…">
      {error ? (
        <List.EmptyView
          title="Could not load events"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
            </ActionPanel>
          }
        />
      ) : !isLoading && events.length === 0 ? (
        <List.EmptyView title="No events" description="This monitor has no events yet." />
      ) : (
        events.map((event) => <MonitorEventItem key={event.uuid} event={event} />)
      )}
    </List>
  );
}

function MonitorEventItem({ event }: { event: PerigonMonitorEvent }) {
  const category = humanizeSchemaValue(event.eventType);
  const title = event.summary || event.articleTitle || category || "Event";

  return (
    <List.Item
      title={title}
      subtitle={category || undefined}
      keywords={event.eventType ? [event.eventType, category] : undefined}
      accessories={event.createdAt ? [{ text: formatAddedTimestamp(event.createdAt) }] : undefined}
      actions={
        <ActionPanel>
          {event.articleUrl ? (
            <Action.OpenInBrowser title="Open Article" url={event.articleUrl} />
          ) : (
            <Action title="No URL" onAction={() => undefined} />
          )}
          <Action.CopyToClipboard title="Copy Summary" content={event.summary || event.articleTitle || title} />
        </ActionPanel>
      }
    />
  );
}

function MonitorNewslettersView({ monitor }: { monitor: PerigonMonitor }) {
  const { data, isLoading, error, revalidate } = usePromise(listMonitorNewsletters, [monitor.uuid], {
    failureToastOptions: { title: "Could not load briefings" },
  });

  const newsletters = data ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={monitor.name} searchBarPlaceholder="Filter briefings…">
      {error ? (
        <List.EmptyView
          title="Could not load briefings"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
            </ActionPanel>
          }
        />
      ) : !isLoading && newsletters.length === 0 ? (
        <List.EmptyView title="No briefings" description="This monitor has no newsletters yet." />
      ) : (
        newsletters.map((newsletter) => <NewsletterListItem key={newsletter.uuid} newsletter={newsletter} />)
      )}
    </List>
  );
}

function NewsletterListItem({ newsletter }: { newsletter: PerigonMonitorNewsletter }) {
  return (
    <List.Item
      title={newsletter.title}
      subtitle={newsletter.createdAt ? formatDate(newsletter.createdAt) : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Briefing"
            target={
              <Detail
                markdown={newsletter.content || "_No content._"}
                metadata={
                  newsletter.createdAt ? (
                    <Detail.Metadata>
                      <Detail.Metadata.Label title="Created" text={formatDate(newsletter.createdAt)} />
                    </Detail.Metadata>
                  ) : undefined
                }
              />
            }
          />
          <Action.CopyToClipboard title="Copy Markdown" content={newsletter.content} />
        </ActionPanel>
      }
    />
  );
}

function MonitorUnsupportedView({ monitor }: { monitor: PerigonMonitor }) {
  return (
    <Detail
      navigationTitle={monitor.name}
      markdown={`# ${monitor.name}

This monitor type is **${monitor.classificationType || "unknown"}**. Use **Ask Perigon** in Raycast AI for full monitor tools.`}
    />
  );
}

function isMonitorFilter(value: string): value is MonitorFilter {
  return (MONITOR_FILTERS as readonly string[]).includes(value);
}

function monitorGroup(status: string): MonitorGroup | null {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "STOPPED":
    case "PAUSED":
      return "paused";
    case "DRAFT":
      return "draft";
    default:
      return null;
  }
}

function groupMonitors(monitors: PerigonMonitor[]): Record<MonitorGroup, PerigonMonitor[]> {
  const grouped: Record<MonitorGroup, PerigonMonitor[]> = { active: [], paused: [], draft: [] };
  for (const monitor of monitors) {
    const group = monitorGroup(monitor.status);
    if (group) {
      grouped[group].push(monitor);
    }
  }
  return grouped;
}

function monitorImageUrl(uuid: string): string {
  return `https://images.perigon.io/${uuid}`;
}

function statusLabel(status: string): string {
  switch (monitorGroup(status)) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "draft":
      return "Draft";
    default:
      return status || "Unknown";
  }
}

function statusAccessory(status: string): List.Item.Accessory {
  const group = monitorGroup(status);
  if (group === "active") {
    return {
      tag: { value: "Active", color: ACTIVE_CHIP_COLOR },
      icon: { source: Icon.CircleFilled, tintColor: ACTIVE_CHIP_COLOR },
      tooltip: "Actively monitoring for new events",
    };
  }
  if (group === "paused") {
    return {
      tag: { value: "Paused", color: MUTED_CHIP_COLOR },
      icon: { source: Icon.BellDisabled, tintColor: MUTED_CHIP_COLOR },
      tooltip: "Monitoring is paused",
    };
  }
  return {
    tag: { value: statusLabel(status), color: MUTED_CHIP_COLOR },
    tooltip: group === "draft" ? "This monitor is still being configured" : undefined,
  };
}

function emptyFilterTitle(filter: MonitorFilter): string {
  switch (filter) {
    case "active":
      return "No active monitors";
    case "paused":
      return "No paused monitors";
    case "draft":
      return "No drafts";
    default:
      return "No monitors";
  }
}

const SCHEMA_VALUE_ACRONYMS = new Set(["ai", "api", "ceo", "cfo", "coo", "cto", "eu", "ipo", "sec", "uk", "url", "us"]);

function humanizeSchemaValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/\s/.test(trimmed) && /[a-z]/.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (SCHEMA_VALUE_ACRONYMS.has(lower)) {
        return lower.toUpperCase();
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function formatAddedTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (diffInHours < 24) {
    if (diffInHours < 0) {
      return `${formatAddedDate(date, now)} ${time}`;
    }
    const hours = Math.floor(diffInHours);
    const minutes = Math.floor((diffInHours - hours) * 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return minutes < 1 ? "Just now" : `${minutes}m ago`;
  }

  if (isYesterday(date, now)) {
    return `Yesterday ${time}`;
  }

  return `${formatAddedDate(date, now)} ${time}`;
}

function formatAddedDate(date: Date, now: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

function isYesterday(date: Date, now: Date): boolean {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  return date >= startOfYesterday && date < startOfToday;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default withAccessToken(perigonOAuth)(MyMonitors);

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import {
  absoluteTime,
  avatar,
  clockTime,
  dayKey,
  relativeTime,
  timelineEmoji,
  timelineIcon,
  timelineLabel,
} from "../lib/format";
import { pullRequestDetail } from "../lib/github";
import type { PullRequest, TimelineEvent } from "../lib/types";

/** The date windows offered in the dropdown, mirroring the dashboard's range picker. */
const RANGES = [
  { value: "all", title: "All time", days: 0 },
  { value: "1", title: "Last 24 hours", days: 1 },
  { value: "7", title: "Last 7 days", days: 7 },
  { value: "30", title: "Last 30 days", days: 30 },
  { value: "90", title: "Last 90 days", days: 90 },
];

type TimelineProps = {
  pr: PullRequest;
  /** Pass already-loaded events to skip the fetch. */
  events?: TimelineEvent[];
};

/**
 * Applies the text query and date range, exactly like the web dashboard's
 * timeline modal: the query matches the kind, its label, the actor, and the
 * body text.
 */
function filterEvents(events: TimelineEvent[], query: string, days: number): TimelineEvent[] {
  const q = query.trim().toLowerCase();
  const cutoff = days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

  return events.filter((event) => {
    if (cutoff) {
      const at = Date.parse(event.at);
      if (Number.isFinite(at) && at < cutoff) return false;
    }
    if (!q) return true;
    const haystack = `${event.kind} ${timelineLabel(event.kind)} ${event.actor} ${event.text ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}

/** Groups events into calendar-day buckets, newest day first. */
function groupByDay(events: TimelineEvent[]): { day: string; events: TimelineEvent[] }[] {
  const groups: { day: string; events: TimelineEvent[] }[] = [];
  for (const event of events) {
    const day = dayKey(event.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.events.push(event);
    } else {
      groups.push({ day, events: [event] });
    }
  }
  return groups;
}

/** The right-hand pane for one event: its full text plus exact metadata. */
function eventDetail(event: TimelineEvent, pr: PullRequest) {
  const heading = `${timelineEmoji(event.kind)} **@${event.actor || "someone"}** ${timelineLabel(event.kind)}`;
  const body = event.text ? ["", "---", "", event.text] : ["", "_No text on this event._"];

  return (
    <List.Item.Detail
      markdown={[heading, ...body].join("\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Event"
            text={timelineLabel(event.kind)}
            icon={timelineIcon(event.kind)}
          />
          <List.Item.Detail.Metadata.Label
            title="Actor"
            text={event.actor ? `@${event.actor}` : "unknown"}
            icon={event.actor ? avatar(event.actor) : Icon.Person}
          />
          <List.Item.Detail.Metadata.Label title="When" text={absoluteTime(event.at)} />
          <List.Item.Detail.Metadata.Label title="Age" text={`${relativeTime(event.at)} ago`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Open"
            target={event.url || pr.url}
            text={event.url ? "This event on GitHub" : `${pr.repository}#${pr.number}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * The pull request's full history as a scrollable, filterable timeline —
 * the Raycast counterpart of the web dashboard's timeline modal. Search
 * narrows by text, the dropdown narrows by date range, and events are grouped
 * by calendar day.
 */
export function Timeline({ pr, events: provided }: TimelineProps) {
  const [owner, name] = pr.repository.split("/");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useCachedPromise(
    async (o: string, n: string, num: number) => (await pullRequestDetail(o, n, num)).timeline,
    [owner, name, pr.number],
    { execute: provided === undefined, keepPreviousData: true, initialData: [] as TimelineEvent[] },
  );

  // Newest first, matching every other view in the extension.
  const all = [...(provided ?? data ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  const days = RANGES.find((r) => r.value === range)?.days ?? 0;
  const visible = filterEvents(all, query, days);
  const groups = groupByDay(visible);

  const counted = visible.length === all.length ? `${all.length} events` : `${visible.length} of ${all.length} events`;

  return (
    <List
      isLoading={isLoading}
      // Filtering is done here rather than by Raycast, so the query matches the
      // same fields the web dashboard searches: kind, label, actor, and body.
      filtering={false}
      onSearchTextChange={setQuery}
      isShowingDetail={showingDetail && visible.length > 0}
      navigationTitle={`${pr.repository}#${pr.number} · Timeline`}
      searchBarPlaceholder="Search the timeline by text, actor, or event…"
      searchBarAccessory={
        <List.Dropdown tooltip="Date range" storeValue onChange={setRange}>
          {RANGES.map((r) => (
            <List.Dropdown.Item key={r.value} value={r.value} title={r.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Clock}
        title={isLoading ? "Loading the timeline…" : all.length === 0 ? "No timeline events" : "Nothing matches"}
        description={
          isLoading
            ? undefined
            : all.length === 0
              ? "Nothing has happened on this pull request yet."
              : "Try a different search term or a wider date range."
        }
      />

      {groups.map((group) => (
        <List.Section key={group.day} title={group.day} subtitle={`${group.events.length}`}>
          {group.events.map((event, index) => (
            <List.Item
              key={`${event.kind}-${event.at}-${index}`}
              icon={timelineIcon(event.kind)}
              title={timelineLabel(event.kind)}
              subtitle={showingDetail ? undefined : (event.text ?? "").split("\n")[0]}
              accessories={[
                ...(event.actor ? [{ icon: avatar(event.actor), tooltip: `@${event.actor}` }] : []),
                { text: clockTime(event.at), tooltip: absoluteTime(event.at) },
                { tag: { value: `${relativeTime(event.at)} ago`, color: Color.SecondaryText } },
              ]}
              detail={eventDetail(event, pr)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title={event.url ? "Open This Event on GitHub" : "Open Pull Request"}
                    url={event.url || pr.url}
                  />
                  <Action
                    icon={Icon.Sidebar}
                    title={showingDetail ? "Hide Detail Pane" : "Show Detail Pane"}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={() => setShowingDetail((current) => !current)}
                  />
                  {event.text ? <Action.CopyToClipboard title="Copy Event Text" content={event.text} /> : null}
                  <Action.CopyToClipboard title="Copy Pull Request URL" content={pr.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {visible.length > 0 ? <List.Section title={counted} /> : null}
    </List>
  );
}

/**
 * Root Tesla Clips browser: scan overview, actions, and year-grouped navigation.
 *
 * @module components/event-list
 */

import { useMemo } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { getCleanupTargetEvents } from "../lib/cleanup-merged";
import {
  formatYearGroupDetailMarkdown,
  formatYearGroupSubtitle,
  groupEventsByYear,
  type EventYearGroup,
} from "../lib/event-day-groups";
import type { EventMergeResult, MergeOptions, ScanResult, TeslaEvent } from "../types";
import { EventAllEventsList } from "./event-all-events-list";
import { EventYearDaysList } from "./event-year-days-list";
import { SharedActionsSection } from "./shared-actions";

/** Props for {@link EventList}. */
type EventListProps = {
  readonly events: TeslaEvent[];
  readonly isLoading: boolean;
  readonly scanError: string | undefined;
  readonly scanSummary: ScanResult | undefined;
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly isMerging: boolean;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
  readonly onOpenCleanupReview?: () => void;
};

function EventYearRow({
  yearGroup,
  eventStatuses,
  mergingEventId,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
}: {
  readonly yearGroup: EventYearGroup;
  readonly eventStatuses: Map<string, EventMergeResult>;
  readonly mergingEventId: string | undefined;
  readonly onMergeEvent: (event: TeslaEvent) => void;
  readonly onMergeAll: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly mergeOptions: MergeOptions;
  readonly onSelectFolders?: () => void;
}) {
  return (
    <List.Item
      title={yearGroup.label}
      subtitle={formatYearGroupSubtitle(yearGroup)}
      keywords={[yearGroup.yearKey, yearGroup.label]}
      icon={{ source: Icon.Calendar, tintColor: MODERN_COLORS.primary }}
      accessories={[{ icon: Icon.ChevronRight, tooltip: `${yearGroup.eventCount} recordings` }]}
      detail={<List.Item.Detail markdown={formatYearGroupDetailMarkdown(yearGroup)} />}
      actions={
        <ActionPanel>
          <Action.Push
            title={`View ${yearGroup.label}`}
            icon={Icon.ArrowRight}
            target={
              <EventYearDaysList
                yearGroup={yearGroup}
                eventStatuses={eventStatuses}
                mergingEventId={mergingEventId}
                onMergeEvent={onMergeEvent}
                onMergeAll={onMergeAll}
                onRefresh={onRefresh}
                mergeOptions={mergeOptions}
                {...(onSelectFolders ? { onSelectFolders } : {})}
              />
            }
          />
          <Action title="Merge All Events" icon={Icon.BulletPoints} onAction={onMergeAll} />
          <SharedActionsSection onRefresh={onRefresh} onSelectFolders={onSelectFolders} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Renders the main list with overview, merge/cleanup shortcuts, and per-year drill-down.
 *
 * @param props - Scan state, merge handlers, and optional cleanup/folder actions.
 * @returns Raycast `List` for the Tesla Clips home screen.
 */
export function EventList({
  events,
  isLoading,
  scanError,
  scanSummary,
  eventStatuses,
  mergingEventId,
  isMerging,
  onMergeEvent,
  onMergeAll,
  onRefresh,
  mergeOptions,
  onSelectFolders,
  onOpenCleanupReview,
}: EventListProps) {
  const summarySubtitle = scanSummary ? `${scanSummary.totalEvents} events` : undefined;
  const yearGroups = useMemo(() => groupEventsByYear(events), [events]);
  const yearCountLabel = `${yearGroups.length} year${yearGroups.length !== 1 ? "s" : ""}`;
  const cleanupTargetCount = useMemo(() => getCleanupTargetEvents(events).length, [events]);
  const eventCountLabel = `${events.length} event${events.length !== 1 ? "s" : ""}`;
  return (
    <List isLoading={isLoading || isMerging} isShowingDetail={events.length > 0} searchBarPlaceholder="Search years...">
      {events.length === 0 && !isLoading && scanError ? (
        <List.EmptyView
          title="Scan Failed"
          description={scanError}
          icon={{ source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRefresh} />
              {onSelectFolders ? (
                <Action title="Change Source Folders" icon={Icon.Folder} onAction={onSelectFolders} />
              ) : null}
            </ActionPanel>
          }
        />
      ) : events.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Tesla Clip Events Found"
          description="Select folders containing Tesla clip events in Finder, or set a Default Source Folder in preferences."
          icon={Icon.Video}
          actions={
            <ActionPanel>
              {onSelectFolders ? (
                <Action title="Select Source Folders" icon={Icon.Folder} onAction={onSelectFolders} />
              ) : null}
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {scanSummary ? (
            <List.Section title="Overview" {...(summarySubtitle ? { subtitle: summarySubtitle } : {})}>
              <List.Item
                title="All Events"
                subtitle={eventCountLabel}
                icon={{ source: Icon.Layers, tintColor: MODERN_COLORS.primary }}
                accessories={[{ icon: Icon.ChevronRight, tooltip: "View flat list of all recordings" }]}
                detail={
                  <List.Item.Detail
                    markdown={`Browse all ${events.length} recordings in a flat list sorted newest first.\n\nPress **Enter** to open the full event list.`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View All Events"
                      icon={Icon.ArrowRight}
                      target={
                        <EventAllEventsList
                          events={events}
                          eventStatuses={eventStatuses}
                          mergingEventId={mergingEventId}
                          onMergeEvent={onMergeEvent}
                          onMergeAll={onMergeAll}
                          onRefresh={onRefresh}
                          mergeOptions={mergeOptions}
                          {...(onSelectFolders ? { onSelectFolders } : {})}
                        />
                      }
                    />
                    <Action title="Merge All Events" icon={Icon.BulletPoints} onAction={onMergeAll} />
                    <SharedActionsSection onRefresh={onRefresh} onSelectFolders={onSelectFolders} />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}
          {events.length > 0 ? (
            <List.Section title="Actions">
              <List.Item
                title="Merge Clips"
                subtitle="Review and merge recordings"
                icon={{ source: Icon.Play, tintColor: MODERN_COLORS.primary }}
                accessories={[{ icon: Icon.ChevronRight, tooltip: "Combine split clips into continuous videos" }]}
                detail={
                  <List.Item.Detail markdown="Review events and merge split Tesla camera clips into continuous recordings per camera angle." />
                }
                actions={
                  <ActionPanel>
                    <Action title="Open Merge Overview" icon={Icon.List} onAction={onMergeAll} />
                    <SharedActionsSection onRefresh={onRefresh} onSelectFolders={onSelectFolders} />
                  </ActionPanel>
                }
              />
              {cleanupTargetCount > 0 && onOpenCleanupReview ? (
                <List.Item
                  title="Remove Merged Outputs"
                  subtitle={`${cleanupTargetCount} event${cleanupTargetCount !== 1 ? "s" : ""} with merged folders`}
                  icon={{ source: Icon.Trash, tintColor: MODERN_COLORS.warning }}
                  accessories={[{ icon: Icon.ChevronRight, tooltip: "Review merged folders before removing" }]}
                  detail={
                    <List.Item.Detail
                      markdown={`Review **${cleanupTargetCount}** event${cleanupTargetCount !== 1 ? "s" : ""} with merged output folders before moving them to Trash.\n\nOriginal split clips are kept.`}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action title="Open Remove Overview" icon={Icon.Trash} onAction={onOpenCleanupReview} />
                      <SharedActionsSection onRefresh={onRefresh} onSelectFolders={onSelectFolders} />
                    </ActionPanel>
                  }
                />
              ) : null}
            </List.Section>
          ) : null}
          <List.Section title="Years" subtitle={yearCountLabel}>
            {yearGroups.map((yearGroup) => (
              <EventYearRow
                key={yearGroup.yearKey}
                yearGroup={yearGroup}
                eventStatuses={eventStatuses}
                mergingEventId={mergingEventId}
                onMergeEvent={onMergeEvent}
                onMergeAll={onMergeAll}
                onRefresh={onRefresh}
                mergeOptions={mergeOptions}
                {...(onSelectFolders ? { onSelectFolders } : {})}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

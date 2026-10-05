/**
 * Live cleanup progress and completion summary when removing merged folders.
 *
 * @module components/cleanup-run-view
 */

import { useMemo } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { useCleanupRunner } from "../hooks/use-cleanup-runner";
import { useRunOnce } from "../hooks/use-run-once";
import { buildCleanupCompleteIntroMarkdown, buildCleanupProgressTitle } from "../lib/cleanup-merged";
import { buildCleanupEventDetailMarkdown } from "../lib/cleanup-categories";
import { formatEventTitle } from "../lib/format-event";
import type { CleanupEventResult, CleanupRunResult, TeslaEvent } from "../types";
import { RunEventsSection } from "./run-events-section";
import { RunFailedView } from "./run-failed-view";

/** Props for {@link CleanupRunView}. */
type CleanupRunViewProps = {
  readonly events: readonly TeslaEvent[];
  readonly outputRootPath?: string;
  readonly onDismiss: () => void;
};

function getCleanupRunEventStatus(
  eventId: string,
  eventStatuses: ReadonlyMap<string, CleanupEventResult>,
  cleaningEventId: string | undefined,
): CleanupRunEventStatus {
  if (cleaningEventId === eventId) {
    return "removing";
  }

  const result = eventStatuses.get(eventId);
  if (!result) {
    return "waiting";
  }

  return result.success ? "done" : "failed";
}

function getCleanupRunEventIcon(status: CleanupRunEventStatus): { source: Icon; tintColor: string } {
  switch (status) {
    case "waiting":
      return { source: Icon.Circle, tintColor: MODERN_COLORS.neutral };
    case "removing":
      return { source: Icon.CircleProgress, tintColor: MODERN_COLORS.primary };
    case "done":
      return { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error };
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled CleanupRunEventStatus: ${String(_exhaustive)}`);
    }
  }
}

function buildCleanupEventSubtitle(status: CleanupRunEventStatus, result: CleanupEventResult | undefined): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "removing":
      return "Removing…";
    case "done":
      return "Moved to Trash";
    case "failed":
      return result?.errorMessage ?? "Failed";
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled CleanupRunEventStatus: ${String(_exhaustive)}`);
    }
  }
}

function buildCleanupEventDetailMarkdownForRun(
  event: TeslaEvent,
  result: CleanupEventResult | undefined,
  isActive: boolean,
  outputRootPath?: string,
): string {
  if (isActive) {
    return `Removing merged folder for **${formatEventTitle(event.folderName)}**…`;
  }

  if (result?.success) {
    return `Moved merged folder to Trash:\n\n\`${result.outputDir}\``;
  }

  if (result && !result.success) {
    return `Failed to remove merged folder:\n\n\`${result.outputDir}\`\n\n${result.errorMessage ?? "Unknown error"}`;
  }

  return buildCleanupEventDetailMarkdown(event, outputRootPath);
}

type CleanupRunEventStatus = "waiting" | "removing" | "done" | "failed";

/**
 * Renders per-event removal progress, then results when {@link useCleanupRunner} completes.
 *
 * @param props - Selected events, optional output root, and dismiss handler.
 * @returns Progress or completion `List` (or empty view on fatal error).
 */
export function CleanupRunView({ events, outputRootPath, onDismiss }: CleanupRunViewProps) {
  const { eventStatuses, cleaningEventId, cleanupProgress, isCleaning, cleanupAll } = useCleanupRunner();
  const { phase, result, runError } = useRunOnce<CleanupRunResult>(
    () => cleanupAll(events, outputRootPath),
    () => {},
    "Cleanup failed",
  );

  const completedCount = useMemo(() => {
    return events.filter((event) => eventStatuses.has(event.id)).length;
  }, [events, eventStatuses]);

  const totalCount = cleanupProgress.total > 0 ? cleanupProgress.total : events.length;

  if (phase === "complete" && result) {
    const hasFailures = result.failed > 0;
    const title = hasFailures ? "Cleanup Completed with Errors" : "Cleanup Complete";

    return (
      <List navigationTitle={title} isShowingDetail searchBarPlaceholder="Search results...">
        <List.Section title="Summary">
          <List.Item
            title="Cleanup Results"
            subtitle={result.summaryMessage}
            icon={{
              source: hasFailures ? Icon.ExclamationMark : Icon.CheckCircle,
              tintColor: hasFailures ? MODERN_COLORS.warning : MODERN_COLORS.success,
            }}
            detail={<List.Item.Detail markdown={buildCleanupCompleteIntroMarkdown(result)} />}
            actions={
              <ActionPanel>
                <Action title="Done" icon={Icon.CheckCircle} onAction={onDismiss} />
              </ActionPanel>
            }
          />
        </List.Section>

        <RunEventsSection
          events={events}
          renderEventRow={(event) => {
            const eventResult = eventStatuses.get(event.id);
            const status = getCleanupRunEventStatus(event.id, eventStatuses, undefined);

            return (
              <List.Item
                key={event.id}
                title={formatEventTitle(event.folderName)}
                subtitle={buildCleanupEventSubtitle(status, eventResult)}
                icon={getCleanupRunEventIcon(status)}
                detail={
                  <List.Item.Detail
                    markdown={buildCleanupEventDetailMarkdownForRun(event, eventResult, false, outputRootPath)}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="Done" icon={Icon.CheckCircle} onAction={onDismiss} />
                  </ActionPanel>
                }
              />
            );
          }}
        />
      </List>
    );
  }

  if (phase === "complete" && runError) {
    return <RunFailedView navigationTitle="Cleanup Failed" description={runError} onDismiss={onDismiss} />;
  }

  const progressTitle = buildCleanupProgressTitle(completedCount, totalCount);

  return (
    <List
      navigationTitle={progressTitle}
      isShowingDetail
      isLoading={isCleaning && completedCount === 0 && !cleaningEventId}
    >
      <List.Section title="Progress" subtitle={`${completedCount} of ${totalCount} events`}>
        {events.map((event) => {
          const eventResult = eventStatuses.get(event.id);
          const status = getCleanupRunEventStatus(event.id, eventStatuses, cleaningEventId);

          return (
            <List.Item
              key={event.id}
              title={formatEventTitle(event.folderName)}
              subtitle={buildCleanupEventSubtitle(status, eventResult)}
              icon={getCleanupRunEventIcon(status)}
              detail={
                <List.Item.Detail
                  markdown={buildCleanupEventDetailMarkdownForRun(
                    event,
                    eventResult,
                    status === "removing",
                    outputRootPath,
                  )}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

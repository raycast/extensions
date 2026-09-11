/**
 * Live merge progress and completion summary for a batch of events.
 *
 * @module components/merge-run-view
 */

import { useMemo } from "react";
import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { MODERN_COLORS } from "../constants";
import { useMergeRunner } from "../hooks/use-merge-runner";
import { useRunOnce } from "../hooks/use-run-once";
import { formatEventTitle, formatMergeStatus } from "../lib/format-event";
import {
  buildMergeCompleteIntroMarkdown,
  buildMergeProgressTitle,
  getMergeRunEventIcon,
  getMergeRunEventLabel,
  getMergeRunEventStatus,
  summarizeEventMergeResult,
} from "../lib/merge-progress";
import { resolveEventOutputDir } from "../lib/paths";
import { buildSummaryMessage } from "../lib/results";
import type { EventMergeResult, MergeOptions, MergeRunResult, TeslaEvent } from "../types";
import { RunEventsSection } from "./run-events-section";
import { RunFailedView } from "./run-failed-view";

async function openFolder(target: string): Promise<void> {
  try {
    await open(target);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open folder" });
  }
}

/** Props for {@link MergeRunView}. */
type MergeRunViewProps = {
  readonly events: readonly TeslaEvent[];
  readonly mergeOptions: MergeOptions;
  readonly openOutputWhenDone: boolean;
  readonly onDismiss: () => void;
};

function MergeCompleteMetadata({ result }: { readonly result: MergeRunResult }) {
  const { totals } = result;
  const hasFailures = totals.failed > 0;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Events"
        text={`${totals.eventsWithClips}/${totals.eventsScanned}`}
        icon={{ source: Icon.List, tintColor: MODERN_COLORS.primary }}
      />
      <List.Item.Detail.Metadata.Label
        title="Merged"
        text={`${totals.merged}`}
        icon={{ source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }}
      />
      <List.Item.Detail.Metadata.Label
        title="Existing Skipped"
        text={`${totals.skippedExisting}`}
        icon={{ source: Icon.Document, tintColor: MODERN_COLORS.neutral }}
      />
      <List.Item.Detail.Metadata.Label
        title="Single-Segment Skipped"
        text={`${totals.skippedSingle}`}
        icon={{ source: Icon.Video, tintColor: MODERN_COLORS.neutral }}
      />
      <List.Item.Detail.Metadata.Label
        title="Failed"
        text={`${totals.failed}`}
        icon={{
          source: hasFailures ? Icon.XMarkCircle : Icon.CheckCircle,
          tintColor: hasFailures ? MODERN_COLORS.error : MODERN_COLORS.success,
        }}
      />
    </List.Item.Detail.Metadata>
  );
}

function buildEventProgressDetailMarkdown(
  event: TeslaEvent,
  result: EventMergeResult | undefined,
  isActive: boolean,
): string {
  if (isActive) {
    return `Merging **${formatEventTitle(event.folderName)}** now…`;
  }

  if (!result) {
    return `Waiting to merge **${formatEventTitle(event.folderName)}**.`;
  }

  const lines = result.outputs.map((output) => {
    const statusLabel =
      output.status === "failed" && output.errorMessage
        ? `Failed · ${output.errorMessage}`
        : formatMergeStatus(output.status);
    return `- **${output.camera}** · ${statusLabel}`;
  });

  return [`### ${formatEventTitle(event.folderName)}`, "", ...lines].join("\n");
}

function buildEventProgressSubtitle(
  status: ReturnType<typeof getMergeRunEventStatus>,
  eventResult: EventMergeResult | undefined,
): string {
  if (status === "merging") {
    return "Merging…";
  }

  if (status === "waiting") {
    return "Waiting";
  }

  return eventResult ? summarizeEventMergeResult(eventResult) : getMergeRunEventLabel(status);
}

/**
 * Renders per-event merge progress, then a results summary when {@link useMergeRunner} finishes.
 *
 * @param props - Events to merge, options, open-folder preference, and dismiss callback.
 * @returns Progress or completion `List` (or empty view on fatal error).
 */
export function MergeRunView({ events, mergeOptions, openOutputWhenDone, onDismiss }: MergeRunViewProps) {
  const { eventStatuses, mergingEventId, mergeProgress, isMerging, mergeAll } = useMergeRunner();
  const { phase, result, runError } = useRunOnce<MergeRunResult>(
    () => mergeAll(events, mergeOptions),
    async (mergeResult) => {
      if (!openOutputWhenDone) {
        return;
      }

      const firstRoot = mergeResult.results[0];
      if (firstRoot) {
        await openFolder(firstRoot.outputBase);
      }
    },
    "Merge failed",
  );

  const completedCount = useMemo(() => {
    return events.filter((event) => eventStatuses.has(event.id)).length;
  }, [events, eventStatuses]);

  const totalCount = mergeProgress.total > 0 ? mergeProgress.total : events.length;

  if (phase === "complete" && result) {
    const hasFailures = result.totals.failed > 0;
    const title = hasFailures ? "Merge Completed with Errors" : "Merge Complete";

    return (
      <List navigationTitle={title} isShowingDetail searchBarPlaceholder="Search results...">
        <List.Section title="Summary">
          <List.Item
            title="Merge Results"
            subtitle={buildSummaryMessage(result.totals)}
            icon={{
              source: hasFailures ? Icon.ExclamationMark : Icon.CheckCircle,
              tintColor: hasFailures ? MODERN_COLORS.warning : MODERN_COLORS.success,
            }}
            detail={
              <List.Item.Detail
                markdown={buildMergeCompleteIntroMarkdown(result.totals, hasFailures)}
                metadata={<MergeCompleteMetadata result={result} />}
              />
            }
            actions={
              <ActionPanel>
                <Action title="Done" icon={Icon.CheckCircle} onAction={onDismiss} />
                {result.results[0] ? (
                  <Action
                    title="Open Output Folder"
                    icon={Icon.Folder}
                    onAction={() => void openFolder(result.results[0]!.outputBase)}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        </List.Section>

        <RunEventsSection
          events={events}
          renderEventRow={(event) => {
            const eventResult = eventStatuses.get(event.id);
            const status = getMergeRunEventStatus(event.id, eventStatuses, undefined);

            return (
              <List.Item
                key={event.id}
                title={formatEventTitle(event.folderName)}
                subtitle={buildEventProgressSubtitle(status, eventResult)}
                icon={getMergeRunEventIcon(status)}
                detail={<List.Item.Detail markdown={buildEventProgressDetailMarkdown(event, eventResult, false)} />}
                actions={
                  <ActionPanel>
                    <Action title="Done" icon={Icon.CheckCircle} onAction={onDismiss} />
                    <Action
                      title="Open Event Folder"
                      icon={Icon.Folder}
                      onAction={() =>
                        void openFolder(
                          resolveEventOutputDir(event.eventDir, event.sourceRoot, mergeOptions.outputRootPath),
                        )
                      }
                    />
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
    return <RunFailedView navigationTitle="Merge Failed" description={runError} onDismiss={onDismiss} />;
  }

  const progressTitle = buildMergeProgressTitle(completedCount, totalCount);

  return (
    <List
      navigationTitle={progressTitle}
      isShowingDetail
      isLoading={isMerging && completedCount === 0 && !mergingEventId}
    >
      <List.Section title="Progress" subtitle={`${completedCount} of ${totalCount} events`}>
        {events.map((event) => {
          const eventResult = eventStatuses.get(event.id);
          const status = getMergeRunEventStatus(event.id, eventStatuses, mergingEventId);

          return (
            <List.Item
              key={event.id}
              title={formatEventTitle(event.folderName)}
              subtitle={buildEventProgressSubtitle(status, eventResult)}
              icon={getMergeRunEventIcon(status)}
              detail={
                <List.Item.Detail
                  markdown={buildEventProgressDetailMarkdown(event, eventResult, status === "merging")}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

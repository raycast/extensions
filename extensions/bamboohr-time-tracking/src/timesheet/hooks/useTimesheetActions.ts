import { Alert, confirmAlert, Toast, showToast } from "@raycast/api";
import { useCallback } from "react";
import { NormalizedTimeEntry, TimesheetEntryInput } from "../../bamboo/api";
import { createClient, formatTimeRange } from "../../helpers";
import { Preferences } from "../../preferences";

export type SplitValues = {
  firstStart: Date | null;
  firstEnd: Date | null;
  secondStart: Date | null;
  secondEnd: Date | null;
  projectId?: string;
};

type UseTimesheetActionsProps = {
  preferences: Preferences;
  onRefresh: () => Promise<void>;
};

export function useTimesheetActions({
  preferences,
  onRefresh,
}: UseTimesheetActionsProps) {
  const client = createClient(preferences);

  const handleDelete = useCallback(
    async (entry: NormalizedTimeEntry) => {
      if (!entry.id) {
        await showToast(
          Toast.Style.Failure,
          "Cannot delete entry",
          "Missing entry identifier",
        );
        return;
      }

      const timeRange = formatTimeRange(entry);
      const confirmed = await confirmAlert({
        title: "Delete entry?",
        message: timeRange,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        return;
      }

      try {
        await client.deleteTimesheetEntry(entry.id);
        await showToast(Toast.Style.Success, "Entry deleted");
        await onRefresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        await showToast(Toast.Style.Failure, "Failed to delete entry", message);
      }
    },
    [client, onRefresh],
  );

  const handleSave = useCallback(
    async (input: TimesheetEntryInput, entry?: NormalizedTimeEntry) => {
      try {
        if (entry?.id) {
          await client.updateTimesheetEntry(entry.id, input);
          await showToast(Toast.Style.Success, "Entry updated");
        } else {
          await client.createTimesheetEntry(input);
          await showToast(Toast.Style.Success, "Entry added");
        }
        await onRefresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        await showToast(Toast.Style.Failure, "Failed to save entry", message);
        throw error;
      }
    },
    [client, onRefresh],
  );

  const handleSplit = useCallback(
    async (entry: NormalizedTimeEntry, split: SplitValues) => {
      const originalStart = split.firstStart ?? entry.start;
      const originalEnd = split.secondEnd ?? entry.end;
      const projectId = split.projectId?.trim() || entry.projectId;

      if (!entry.id || !originalStart || !originalEnd) {
        await showToast(
          Toast.Style.Failure,
          "Cannot split entry",
          "Missing start/end or identifier",
        );
        return;
      }

      const { firstStart, firstEnd, secondStart } = split;
      if (
        !firstStart ||
        !firstEnd ||
        !secondStart ||
        !originalEnd ||
        firstEnd.getTime() <= originalStart.getTime() ||
        secondStart.getTime() <= firstEnd.getTime() ||
        secondStart.getTime() >= originalEnd.getTime()
      ) {
        await showToast(
          Toast.Style.Failure,
          "Invalid split times",
          "Ensure start < first end < second start < final end",
        );
        return;
      }

      const totalDuration = originalEnd.getTime() - originalStart.getTime();
      const firstDuration = firstEnd.getTime() - originalStart.getTime();
      const remainingDuration = Math.max(0, totalDuration - firstDuration);
      const secondEnd =
        split.secondEnd ?? new Date(secondStart.getTime() + remainingDuration);

      try {
        await client.updateTimesheetEntry(entry.id, {
          start: originalStart,
          end: firstEnd,
          type: entry.type,
          projectId,
        });

        await client.createTimesheetEntry({
          start: secondStart,
          end: secondEnd,
          type: entry.type,
          projectId,
        });

        await showToast(Toast.Style.Success, "Entry split");
        await onRefresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        await showToast(Toast.Style.Failure, "Failed to split entry", message);
        throw error;
      }
    },
    [client, onRefresh],
  );

  const handleDaySave = useCallback(
    async (data: {
      toCreate: TimesheetEntryInput[];
      toUpdate: { id: string; input: TimesheetEntryInput }[];
      toDelete: string[];
    }) => {
      try {
        // Process deletions first
        for (const id of data.toDelete) {
          await client.deleteTimesheetEntry(id);
        }

        // Process updates
        for (const { id, input } of data.toUpdate) {
          await client.updateTimesheetEntry(id, input);
        }

        // Process creations
        for (const input of data.toCreate) {
          await client.createTimesheetEntry(input);
        }

        await onRefresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        await showToast(Toast.Style.Failure, "Failed to save day", message);
        throw error;
      }
    },
    [client, onRefresh],
  );

  return {
    handleDelete,
    handleSave,
    handleSplit,
    handleDaySave,
  };
}

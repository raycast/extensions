import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { differenceInSeconds, format, parseISO } from "date-fns";

import { Worklog } from "@/types/models";
import { formatDuration, getErrorMessage } from "@/utils/format";
import { jiraClient } from "@/utils/jira";
import { deleteWorklog, getWorklogs, saveWorklog } from "@/utils/storage";
import AddWorklogCommand from "./add-worklog";
import SplitWorklogCommand from "./split-worklog";

const summaryOptions = { showZeroHours: false, hideZeroMinutes: true, padHours: false, padMinutes: false };

function getSectionSubtitle(totalSeconds: number): string {
  const prefs = getPreferenceValues<Preferences>();
  const dailyHours = prefs.dailyHours ? parseFloat(prefs.dailyHours) : null;

  if (dailyHours && dailyHours > 0) {
    const expectedSeconds = dailyHours * 3600;
    const remainingSeconds = expectedSeconds - totalSeconds;

    if (remainingSeconds > 0) {
      return `Total: ${formatDuration(totalSeconds, summaryOptions)} (${formatDuration(remainingSeconds, { ...summaryOptions, ceiling: true })} remaining)`;
    } else if (remainingSeconds < 0) {
      return `Total: ${formatDuration(totalSeconds, summaryOptions)} (+${formatDuration(Math.abs(remainingSeconds), summaryOptions)} overtime)`;
    } else {
      return `Total: ${formatDuration(totalSeconds, summaryOptions)} ✓`;
    }
  }

  return `Total: ${formatDuration(totalSeconds, summaryOptions)}`;
}

export default function Command() {
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function loadWorklogs() {
    setIsLoading(true);
    try {
      const stored = await getWorklogs();
      // Sort by start time descending
      stored.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setWorklogs(stored);
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: "Failed to load worklogs" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorklogs();
  }, []);

  function toggleSelection(id: string) {
    const worklog = worklogs.find((w) => w.id === id);
    if (!worklog?.endTime) return;

    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  const completableWorklogs = worklogs.filter((w) => !!w.endTime);
  const isAllSelected = completableWorklogs.length > 0 && completableWorklogs.every((w) => selectedIds.has(w.id));

  function toggleAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(completableWorklogs.map((w) => w.id)));
    }
  }

  async function handleDelete(worklog: Worklog) {
    if (await confirmAlert({ title: "Delete Worklog", message: "Are you sure you want to delete this worklog?" })) {
      try {
        await deleteWorklog(worklog.id);
        await showToast({ style: Toast.Style.Success, title: "Worklog Deleted" });
        loadWorklogs();
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to delete" });
      }
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (
      await confirmAlert({
        title: "Delete All Selected",
        message: `Are you sure you want to delete ${ids.length} selected worklogs?`,
      })
    ) {
      try {
        for (const id of ids) {
          await deleteWorklog(id);
        }
        setSelectedIds(new Set());
        await showToast({ style: Toast.Style.Success, title: "Worklogs Deleted" });
        loadWorklogs();
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to delete all" });
      }
    }
  }

  async function handleUpload(worklog: Worklog) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading to Jira..." });
    try {
      await jiraClient.submitWorklog(worklog);
      await deleteWorklog(worklog.id);
      toast.style = Toast.Style.Success;
      toast.title = "Uploaded to Jira";
      loadWorklogs();
    } catch (error) {
      console.error(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upload";
      toast.message = getErrorMessage(error);
    }
  }

  async function handleStopTimer(worklog: Worklog) {
    const now = new Date();
    const startTime = new Date(worklog.startTime);
    const duration = differenceInSeconds(now, startTime);

    const updated: Worklog = {
      ...worklog,
      endTime: now.toISOString(),
      durationSeconds: duration,
    };

    try {
      await saveWorklog(updated);
      await showToast({ style: Toast.Style.Success, title: "Timer Stopped" });
      loadWorklogs();
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to stop timer" });
    }
  }

  async function handleBulkUpload() {
    const toUpload = worklogs.filter(
      (w) => selectedIds.has(w.id) && w.durationSeconds !== undefined && w.endTime !== undefined,
    );

    if (toUpload.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No worklogs selected" });
      return;
    }

    const totalTimeSeconds = toUpload.reduce((acc, w) => acc + (w.durationSeconds || 0), 0);

    if (
      await confirmAlert({
        title: "Confirm Upload",
        message: `Upload ${toUpload.length} worklogs totaling ${formatDuration(totalTimeSeconds, summaryOptions)} to Jira?`,
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Uploading...",
        message: `0 / ${toUpload.length}`,
      });

      let successCount = 0;
      let failCount = 0;

      for (const [index, worklog] of toUpload.entries()) {
        try {
          toast.message = `${index + 1} / ${toUpload.length}`;
          await jiraClient.submitWorklog(worklog);
          await deleteWorklog(worklog.id);
          successCount++;
        } catch (error) {
          console.error(error);
          failCount++;
        }
      }

      setSelectedIds(new Set()); // clear selection

      if (failCount === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Upload Complete";
        toast.message = `Successfully uploaded ${successCount} worklogs`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Upload Finished with Errors";
        toast.message = `Uploaded: ${successCount}, Failed: ${failCount}`;
      }
      loadWorklogs();
    }
  }

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update "now" every minute to refresh calculations
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Group by day
  const sections: { title: string; items: Worklog[] }[] = [];
  let currentSection: { title: string; items: Worklog[] } | null = null;

  worklogs.forEach((worklog) => {
    const title = format(parseISO(worklog.startTime), "EEEE, d MMM yyyy");

    if (!currentSection || currentSection.title !== title) {
      currentSection = { title, items: [] };
      sections.push(currentSection);
    }
    currentSection.items.push(worklog);
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search worklogs...">
      <List.EmptyView
        icon={Icon.Calendar}
        title="No local worklogs"
        description="Add a worklog to get started"
        actions={
          <ActionPanel>
            <Action.Push title="Add Worklog" target={<AddWorklogCommand onSave={loadWorklogs} />} icon={Icon.Plus} />
          </ActionPanel>
        }
      />
      {sections.map((section) => {
        const totalSeconds = section.items.reduce((acc, w) => {
          if (w.endTime) {
            return acc + (w.durationSeconds || 0);
          }
          // For in-progress tasks, calculate duration relative to "now", ensuring it's not negative
          return acc + Math.max(0, differenceInSeconds(now, parseISO(w.startTime)));
        }, 0);
        // Items are currently newest-first (descending) due to main sort. Reverse to show earliest-first.
        const reversedItems = [...section.items].reverse();

        return (
          <List.Section key={section.title} title={section.title} subtitle={getSectionSubtitle(totalSeconds)}>
            {reversedItems.map((worklog) => {
              const isSelected = selectedIds.has(worklog.id);
              return (
                <List.Item
                  key={worklog.id}
                  title={worklog.taskSummary ? `${worklog.taskId}: ${worklog.taskSummary}` : worklog.taskId}
                  subtitle={worklog.description}
                  icon={
                    isSelected
                      ? { source: Icon.Checkmark, tintColor: Color.Green }
                      : !worklog.endTime
                        ? { source: Icon.Clock, tintColor: Color.Blue }
                        : Icon.Circle
                  }
                  accessories={[
                    {
                      text: !worklog.endTime
                        ? `Started: ${format(parseISO(worklog.startTime), "HH:mm")}`
                        : format(parseISO(worklog.startTime), "HH:mm") +
                          " - " +
                          format(parseISO(worklog.endTime!), "HH:mm"),
                    },
                    {
                      tag: {
                        value: !worklog.endTime
                          ? formatDuration(Math.max(0, differenceInSeconds(now, parseISO(worklog.startTime))))
                          : formatDuration(worklog.durationSeconds!),
                        color: !worklog.endTime ? Color.Blue : Color.SecondaryText,
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      {!worklog.endTime && (
                        <Action title="Stop Timer" icon={Icon.Stop} onAction={() => handleStopTimer(worklog)} />
                      )}

                      <ActionPanel.Section title="Selection">
                        {worklog.endTime && (
                          <Action
                            title={isSelected ? "Deselect" : "Select"}
                            icon={isSelected ? Icon.Circle : Icon.Checkmark}
                            onAction={() => toggleSelection(worklog.id)}
                          />
                        )}
                        {completableWorklogs.length > 0 && (
                          <Action
                            title={isAllSelected ? "Deselect All" : "Select All"}
                            icon={Icon.Checkmark}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                            onAction={toggleAll}
                          />
                        )}
                      </ActionPanel.Section>

                      {selectedIds.size > 0 && (
                        <ActionPanel.Section title="Bulk Actions">
                          <Action
                            title={`Upload ${selectedIds.size} Selected`}
                            icon={Icon.Cloud}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                            onAction={handleBulkUpload}
                          />
                          <Action
                            title={`Delete ${selectedIds.size} Selected`}
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                            onAction={handleBulkDelete}
                          />
                        </ActionPanel.Section>
                      )}

                      <ActionPanel.Section title="Single Actions">
                        <Action.Push
                          title="Edit Worklog"
                          icon={Icon.Pencil}
                          target={<AddWorklogCommand worklog={worklog} onSave={loadWorklogs} />}
                        />
                        <Action.Push
                          title="Split Worklog"
                          icon={Icon.Ticket}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                          target={<SplitWorklogCommand worklog={worklog} onSave={loadWorklogs} />}
                        />
                        {worklog.endTime && (
                          <Action
                            title="Upload This Worklog"
                            icon={Icon.Cloud}
                            onAction={() => handleUpload(worklog)}
                          />
                        )}
                        <Action.Push
                          title="Create New Worklog"
                          icon={Icon.Plus}
                          shortcut={{ modifiers: ["cmd"], key: "n" }}
                          target={<AddWorklogCommand onSave={loadWorklogs} />}
                        />
                        <Action
                          title="Delete This Worklog"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                          onAction={() => handleDelete(worklog)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

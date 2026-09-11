import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useEffect, useRef } from "react";

import { isLiteModeColdStart, isLiteModeSyncDue, liteModeSync } from "@/api";
import { removeTimeEntry } from "@/api/timeEntries";
import TimeEntryForm from "@/components/CreateTimeEntryForm";
import RunningTimeEntry from "@/components/RunningTimeEntry";
import UpdateTimeEntryForm from "@/components/UpdateTimeEntryForm";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { formatSeconds } from "@/helpers/formatSeconds";
import { liteMode } from "@/helpers/preferences";
import Shortcut from "@/helpers/shortcuts";
import { Verb, withToast } from "@/helpers/withToast";
import { useProcessedTimeEntries } from "@/hooks/useProcessedTimeEntries";
import { useTimeEntryActions } from "@/hooks/useTimeEntryActions";
import { useTotalDurationToday } from "@/hooks/useTotalDurationToday";

dayjs.extend(duration);

function SyncAction({
  revalidateRunningTimeEntry,
  revalidateTimeEntries,
}: {
  revalidateRunningTimeEntry: () => void;
  revalidateTimeEntries: () => void;
}) {
  if (!liteMode) return null;
  return (
    <Action
      title="Sync from Toggl"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={async () => {
        await showToast({ style: Toast.Style.Animated, title: "Syncing from Toggl..." });
        try {
          await liteModeSync();
          revalidateRunningTimeEntry();
          revalidateTimeEntries();
          await showToast({ style: Toast.Style.Success, title: "Sync complete" });
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Sync failed",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }}
    />
  );
}

function ListView() {
  const {
    isLoading,
    mutateTimeEntries,
    revalidateRunningTimeEntry,
    revalidateTimeEntries,
    runningTimeEntry,
    timeEntries,
    timeEntriesWithUniqueProjectAndDescription,
  } = useProcessedTimeEntries();

  const totalDurationToday = useTotalDurationToday(timeEntries, runningTimeEntry);
  const { resumeTimeEntry } = useTimeEntryActions(revalidateRunningTimeEntry, revalidateTimeEntries);

  // Lite mode: seed cache on first launch or when critical keys are missing
  const coldStartDone = useRef(false);
  useEffect(() => {
    if (!liteMode || coldStartDone.current) return;
    if (!isLiteModeColdStart()) return;
    coldStartDone.current = true;
    (async () => {
      await showToast({ style: Toast.Style.Animated, title: "Syncing from Toggl..." });
      try {
        await liteModeSync();
        revalidateRunningTimeEntry();
        revalidateTimeEntries();
        await showToast({ style: Toast.Style.Success, title: "Sync complete" });
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cache empty — sync when rate limit resets",
          message: "Use ⌘⇧R to sync manually",
        });
      }
    })();
  }, []);

  // Low data mode: check every 10 minutes if an hourly sync is due
  const syncingRef = useRef(false);
  useEffect(() => {
    if (!liteMode) return;
    const check = () => {
      if (syncingRef.current || isLiteModeColdStart() || !isLiteModeSyncDue()) return;
      syncingRef.current = true;
      liteModeSync()
        .then(() => {
          revalidateRunningTimeEntry();
          revalidateTimeEntries();
        })
        .catch(() => {})
        .finally(() => {
          syncingRef.current = false;
        });
    };
    check();
    const id = setInterval(check, 600_000); // 10 minutes
    return () => clearInterval(id);
  }, [revalidateRunningTimeEntry, revalidateTimeEntries]);

  return (
    <List
      isLoading={isLoading}
      throttle
      navigationTitle={isLoading ? undefined : `Today: ${formatSeconds(totalDurationToday)}`}
    >
      {runningTimeEntry && (
        <RunningTimeEntry
          runningTimeEntry={runningTimeEntry}
          revalidateRunningTimeEntry={revalidateRunningTimeEntry}
          revalidateTimeEntries={revalidateTimeEntries}
        />
      )}

      <List.Section title="Actions">
        <List.Item
          title="Create a new time entry"
          icon={"command-icon.png"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Time Entry"
                icon={{ source: Icon.Clock }}
                target={
                  <ExtensionContextProvider>
                    <TimeEntryForm
                      revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                      revalidateTimeEntries={revalidateTimeEntries}
                    />
                  </ExtensionContextProvider>
                }
              />
              <SyncAction
                revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                revalidateTimeEntries={revalidateTimeEntries}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {timeEntriesWithUniqueProjectAndDescription.length > 0 && (
        <List.Section title="Recent time entries">
          {timeEntriesWithUniqueProjectAndDescription.map((timeEntry) => (
            <List.Item
              key={timeEntry.id}
              keywords={[timeEntry.description, timeEntry.project_name || "", timeEntry.client_name || ""]}
              title={timeEntry.description || "No description"}
              subtitle={(timeEntry.client_name ? timeEntry.client_name + " | " : "") + (timeEntry.project_name ?? "")}
              accessories={[
                ...timeEntry.tags.map((tag) => ({ tag })),
                timeEntry.billable ? { tag: { value: "$" } } : {},
                { text: formatSeconds(timeEntry.duration) },
              ]}
              icon={{ source: Icon.Circle, tintColor: timeEntry.project_color }}
              actions={
                <ActionPanel>
                  <Action
                    title="Resume Time Entry"
                    onAction={() => resumeTimeEntry(timeEntry)}
                    icon={{ source: Icon.Clock }}
                  />

                  <Action.Push
                    title="Edit Time Entry"
                    icon={Icon.Pencil}
                    target={
                      <ExtensionContextProvider>
                        <UpdateTimeEntryForm
                          timeEntry={timeEntry}
                          revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                          revalidateTimeEntries={revalidateTimeEntries}
                        />
                      </ExtensionContextProvider>
                    }
                  />

                  <Action.Push
                    title="Create Similar Time Entry"
                    icon={{ source: Icon.Plus }}
                    shortcut={Shortcut.Duplicate}
                    target={
                      <ExtensionContextProvider>
                        <TimeEntryForm
                          initialValues={timeEntry}
                          revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                          revalidateTimeEntries={revalidateTimeEntries}
                        />
                      </ExtensionContextProvider>
                    }
                  />

                  <ActionPanel.Section>
                    <SyncAction
                      revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                      revalidateTimeEntries={revalidateTimeEntries}
                    />

                    <Action
                      title="Delete Time Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await confirmAlert({
                          title: "Delete Time Entry",
                          message: "Are you sure you want to delete this time entry?",
                          icon: {
                            source: Icon.Trash,
                            tintColor: Color.Red,
                          },
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                            onAction: () => {
                              withToast({
                                noun: "Time Entry",
                                verb: Verb.Delete,
                                action: async () => {
                                  await mutateTimeEntries(removeTimeEntry(timeEntry.workspace_id, timeEntry.id));
                                },
                              });
                            },
                          },
                        });
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  return (
    <ExtensionContextProvider>
      <ListView />
    </ExtensionContextProvider>
  );
}

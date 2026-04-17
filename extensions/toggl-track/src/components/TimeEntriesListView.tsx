import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useRef } from "react";

import { liteModeSync, isLiteModeColdStart, isLiteModeSyncDue, removeTimeEntry } from "@/api";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { formatSeconds } from "@/helpers/formatSeconds";
import { liteMode } from "@/helpers/preferences";
import { Verb, withToast } from "@/helpers/withToast";
import { useProcessedTimeEntries } from "@/hooks/useProcessedTimeEntries";
import { useTotalDurationToday } from "@/hooks/useTotalDurationToday";

import UpdateTimeEntryForm from "./UpdateTimeEntryForm";

export function TimeEntriesListView() {
  const {
    isLoading,
    mutateTimeEntries,
    timeEntries,
    timeEntriesWithUniqueProjectAndDescription,
    revalidateRunningTimeEntry,
    revalidateTimeEntries,
  } = useProcessedTimeEntries();

  const totalDurationToday = useTotalDurationToday(timeEntries);

  // Lite mode: seed cache on first launch if critical keys are missing
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

  // Lite mode: check every 10 minutes if an hourly sync is due
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
    const id = setInterval(check, 600_000);
    return () => clearInterval(id);
  }, [revalidateRunningTimeEntry, revalidateTimeEntries]);

  return (
    <List
      isLoading={isLoading}
      throttle
      navigationTitle={isLoading ? undefined : `Total: ${formatSeconds(totalDurationToday)}`}
    >
      {timeEntriesWithUniqueProjectAndDescription.length > 0 && (
        <List.Section title="Recent time entries">
          {timeEntriesWithUniqueProjectAndDescription.map((timeEntry) => (
            <List.Item
              key={timeEntry.id}
              keywords={[timeEntry.description, timeEntry.project_name || "", timeEntry.client_name || ""]}
              title={timeEntry.description || "No description"}
              subtitle={(timeEntry.client_name ? timeEntry.client_name + " | " : "") + (timeEntry.project_name ?? "")}
              accessories={[
                { text: formatSeconds(timeEntry.duration) },
                ...timeEntry.tags.map((tag) => ({ tag })),
                timeEntry.billable ? { tag: { value: "$" } } : {},
              ]}
              icon={{ source: Icon.Circle, tintColor: timeEntry.project_color }}
              actions={
                <ActionPanel>
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
                  <ActionPanel.Section>
                    {liteMode && (
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
                    )}
                    <Action
                      title="Delete Time Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await confirmAlert({
                          title: "Delete Time Entry",
                          message: "Are you sure you want to delete this time entry?",
                          icon: { source: Icon.Trash, tintColor: Color.Red },
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

export default TimeEntriesListView;

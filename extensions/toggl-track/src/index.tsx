import { ActionPanel, clearSearchBar, Icon, List, Action, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useMemo } from "react";

import { createTimeEntry, TimeEntry } from "@/api";
import TimeEntryForm from "@/components/CreateTimeEntryForm";
import RunningTimeEntry from "@/components/RunningTimeEntry";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { formatSeconds } from "@/helpers/formatSeconds";
import { useTimeEntries, useRunningTimeEntry } from "@/hooks";

dayjs.extend(duration);

function ListView() {
  const { timeEntries, isLoadingTimeEntries, revalidateTimeEntries } = useTimeEntries();
  const { runningTimeEntry, isLoadingRunningTimeEntry, revalidateRunningTimeEntry } = useRunningTimeEntry();

  const isLoading = isLoadingTimeEntries || isLoadingRunningTimeEntry;

  const timeEntriesWithUniqueProjectAndDescription = timeEntries.reduce<typeof timeEntries>((acc, timeEntry) => {
    if (
      timeEntry.id === runningTimeEntry?.id ||
      acc.find((t) => t.description === timeEntry.description && t.project_id === timeEntry.project_id)
    )
      return acc;
    return [...acc, timeEntry];
  }, []);

  const totalDurationToday = useMemo(() => {
    let seconds = timeEntries
      .slice(runningTimeEntry ? 1 : 0)
      .filter((timeEntry) => dayjs(timeEntry.start).isSame(dayjs(), "day"))
      .reduce((acc, timeEntry) => acc + timeEntry.duration, 0);
    if (runningTimeEntry) seconds += dayjs().diff(dayjs(runningTimeEntry.start), "second");
    return seconds;
  }, [timeEntries, runningTimeEntry]);

  async function resumeTimeEntry(timeEntry: TimeEntry) {
    await showToast(Toast.Style.Animated, "Starting timer...");
    try {
      await createTimeEntry({
        projectId: timeEntry.project_id ?? undefined,
        workspaceId: timeEntry.workspace_id,
        description: timeEntry.description,
        tags: timeEntry.tags,
        billable: timeEntry.billable,
      });
      revalidateRunningTimeEntry();
      await showToast(Toast.Style.Success, "Time entry resumed");
      await clearSearchBar({ forceScrollToTop: true });
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to resume time entry");
    }
  }

  return (
    <List
      isLoading={isLoading}
      throttle
      navigationTitle={isLoading ? undefined : `Today: ${formatSeconds(totalDurationToday)}`}
    >
      {runningTimeEntry && (
        <RunningTimeEntry {...{ runningTimeEntry, revalidateRunningTimeEntry, revalidateTimeEntries }} />
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
              accessories={[...timeEntry.tags.map((tag) => ({ tag })), { text: timeEntry.billable ? "$" : "" }]}
              icon={{ source: Icon.Circle, tintColor: timeEntry.project_color }}
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    title="Resume Time Entry"
                    onSubmit={() => resumeTimeEntry(timeEntry)}
                    icon={{ source: Icon.Clock }}
                  />
                  <Action.Push
                    title="Create Similar Time Entry"
                    icon={{ source: Icon.Plus }}
                    target={
                      <ExtensionContextProvider>
                        <TimeEntryForm
                          revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                          revalidateTimeEntries={revalidateTimeEntries}
                          initialValues={timeEntry}
                        />
                      </ExtensionContextProvider>
                    }
                  />
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

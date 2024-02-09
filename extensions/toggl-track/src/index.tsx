import { useMemo } from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import RunningTimeEntry from "./components/RunningTimeEntry";
import { ActionPanel, clearSearchBar, Icon, List, Action, showToast, Toast } from "@raycast/api";
import { createTimeEntry, TimeEntry } from "./api";
import CreateTimeEntryForm from "./components/CreateTimeEntryForm";
import { ExtensionContextProvider } from "./context/ExtensionContext";
import { TimeEntryContextProvider, useTimeEntryContext } from "./context/TimeEntryContext";

dayjs.extend(duration);

function ListView() {
  const { isLoading, timeEntries, runningTimeEntry, projects, revalidateRunningTimeEntry, revalidateTimeEntries } =
    useTimeEntryContext();

  const getProjectById = (id: number) => projects.find((p) => p.id === id);

  const timeEntriesWithUniqueProjectAndDescription = timeEntries.reduce(
    (acc, timeEntry) =>
      acc.find((t) => t.description === timeEntry.description && t.project_id === timeEntry.project_id)
        ? acc
        : [...acc, timeEntry],
    [] as TimeEntry[],
  );

  const totalDurationToday = useMemo(() => {
    let seconds = timeEntries
      .slice(runningTimeEntry ? 1 : 0)
      .filter((timeEntry) => dayjs(timeEntry.start).isSame(dayjs(), "day"))
      .reduce((acc, timeEntry) => acc + timeEntry.duration, 0);
    if (runningTimeEntry) seconds += dayjs().diff(dayjs(runningTimeEntry.start), "second");
    return seconds;
  }, [timeEntries, runningTimeEntry]);

  function formatSeconds(seconds: number) {
    const h = Math.floor(seconds / 3600);
    seconds %= 3600;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  async function resumeTimeEntry(timeEntry: TimeEntry) {
    await showToast(Toast.Style.Animated, "Starting timer...");
    try {
      await createTimeEntry({
        projectId: timeEntry.project_id,
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
        <RunningTimeEntry
          project={projects.find(({ id }) => runningTimeEntry.project_id === id)}
          {...{ runningTimeEntry, revalidateRunningTimeEntry, revalidateTimeEntries }}
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
                    <TimeEntryContextProvider>
                      <CreateTimeEntryForm />
                    </TimeEntryContextProvider>
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
              keywords={[timeEntry.description, getProjectById(timeEntry.project_id)?.name || ""]}
              title={timeEntry.description || "No description"}
              subtitle={timeEntry.billable ? "$" : ""}
              accessories={[
                { text: getProjectById(timeEntry?.project_id)?.name },
                { icon: { source: Icon.Dot, tintColor: getProjectById(timeEntry?.project_id)?.color } },
              ]}
              icon={{ source: Icon.Circle, tintColor: getProjectById(timeEntry?.project_id)?.color }}
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    title="Resume Time Entry"
                    onSubmit={() => resumeTimeEntry(timeEntry)}
                    icon={{ source: Icon.Clock }}
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
      <TimeEntryContextProvider>
        <ListView />
      </TimeEntryContextProvider>
    </ExtensionContextProvider>
  );
}

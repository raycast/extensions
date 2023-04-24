import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { AppContextProvider, useAppContext } from "./context";
import RunningTimeEntry from "./components/RunningTimeEntry";
import { ActionPanel, clearSearchBar, Icon, List, Action, showToast, Toast } from "@raycast/api";
import { TimeEntry } from "./toggl/types";
import toggl from "./toggl";
import { storage, refreshStorage } from "./storage";
import ProjectListItem from "./components/ProjectListItem";
import CreateTimeEntryForm from "./components/CreateTimeEntryForm";

dayjs.extend(duration);

function ListView() {
  const { isLoading, isValidToken, projectGroups, runningTimeEntry, timeEntries, projects } = useAppContext();
  const getProjectById = (id: number) => projects.find((p) => p.id === id);

  const timeEntriesWithUniqueProjectAndDescription = timeEntries
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .reduce(
      (acc, timeEntry) =>
        acc.find((t) => t.description === timeEntry.description && t.project_id === timeEntry.project_id)
          ? acc
          : [...acc, timeEntry],
      [] as TimeEntry[]
    );

  const totalDurationToday =
    timeEntries
      .filter((timeEntry) => dayjs(timeEntry.start).isSame(dayjs(), "day"))
      .reduce((acc, timeEntry) => acc + timeEntry.duration, 0) +
    (runningTimeEntry ? dayjs().diff(runningTimeEntry.start, "second") : 0);

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
      await toggl.createTimeEntry({
        projectId: timeEntry.project_id,
        workspaceId: timeEntry.workspace_id,
        description: timeEntry.description,
        tags: timeEntry.tags,
        billable: timeEntry.billable,
      });
      await storage.runningTimeEntry.refresh();
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
      {isValidToken ? (
        !isLoading && (
          <>
            {runningTimeEntry && <RunningTimeEntry runningTimeEntry={runningTimeEntry} />}
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
                        <AppContextProvider>
                          <CreateTimeEntryForm />
                        </AppContextProvider>
                      }
                    />
                    <ActionPanel.Section>
                      <Action.SubmitForm
                        title="Refresh"
                        icon={{ source: Icon.RotateClockwise }}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onSubmit={refreshStorage}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            </List.Section>
            {timeEntriesWithUniqueProjectAndDescription.length > 0 && (
              <List.Section title="Resume recent time entry">
                {timeEntriesWithUniqueProjectAndDescription.map((timeEntry) => (
                  <List.Item
                    key={timeEntry.id}
                    keywords={[timeEntry.description, getProjectById(timeEntry.project_id)?.name || ""]}
                    title={timeEntry.description || "No description"}
                    subtitle={timeEntry.billable ? "$" : ""}
                    accessoryTitle={getProjectById(timeEntry?.project_id)?.name}
                    accessoryIcon={{ source: Icon.Dot, tintColor: getProjectById(timeEntry?.project_id)?.color }}
                    icon={{ source: Icon.Circle, tintColor: getProjectById(timeEntry?.project_id)?.color }}
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          title="Resume Time Entry"
                          onSubmit={() => resumeTimeEntry(timeEntry)}
                          icon={{ source: Icon.Clock }}
                        />
                        <Action.SubmitForm
                          title="Refresh"
                          icon={{ source: Icon.RotateClockwise }}
                          onSubmit={refreshStorage}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            )}
            <List.Section title="Projects">
              {projectGroups &&
                projectGroups.map((group) =>
                  group.projects.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      project={project}
                      subtitle={group.client?.name}
                      accessoryTitle={group.workspace.name}
                    />
                  ))
                )}
            </List.Section>
          </>
        )
      ) : (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Invalid API Key Detected"
          accessoryTitle={`Go to Extensions → Toggl Track`}
        />
      )}
    </List>
  );
}

export default function Command() {
  return (
    <AppContextProvider>
      <ListView />
    </AppContextProvider>
  );
}

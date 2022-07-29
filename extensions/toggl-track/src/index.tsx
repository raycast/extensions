import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { AppContextProvider, useAppContext } from "./context";
import RunningTimeEntry from "./components/RunningTimeEntry";
import {
  ActionPanel,
  clearSearchBar,
  Icon,
  List,
  PushAction,
  showToast,
  SubmitFormAction,
  ToastStyle,
} from "@raycast/api";
import { TimeEntry } from "./toggl/types";
import toggl from "./toggl";
import { storage } from "./storage";
import ProjectListItem from "./components/ProjectListItem";
import CreateTimeEntryForm from "./components/CreateTimeEntryForm";

dayjs.extend(duration);

function ListView() {
  const { isLoading, isValidToken, projectGroups, runningTimeEntry, timeEntries, projects } = useAppContext();
  const getProjectById = (id: number) => projects.find((p) => p.id === id);

  const timeEntriesWithUniqueProjectAndDescription = timeEntries.reduce((acc, timeEntry) => {
    const existing = acc.find((t) => t.description === timeEntry.description && t.pid === timeEntry.pid);
    if (!existing) {
      acc.push(timeEntry);
    }
    return acc;
  }, [] as TimeEntry[]);

  async function resumeTimeEntry(timeEntry: TimeEntry) {
    await showToast(ToastStyle.Animated, "Starting timer...");
    try {
      await toggl.createTimeEntry({
        projectId: timeEntry.pid,
        description: timeEntry.description,
        tags: timeEntry.tags,
        billable: timeEntry.billable,
      });
      await storage.runningTimeEntry.refresh();
      await showToast(ToastStyle.Success, "Time entry resumed");
      await clearSearchBar({ forceScrollToTop: true });
    } catch (e) {
      await showToast(ToastStyle.Failure, "Failed to resume time entry");
    }
  }

  return (
    <List isLoading={isLoading} throttle>
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
                    <PushAction
                      title="Create Time Entry"
                      icon={{ source: Icon.Clock }}
                      target={
                        <AppContextProvider>
                          <CreateTimeEntryForm />
                        </AppContextProvider>
                      }
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
            {timeEntriesWithUniqueProjectAndDescription.length > 0 && (
              <List.Section title="Resume recent time entry">
                {timeEntriesWithUniqueProjectAndDescription.map((timeEntry) => (
                  <List.Item
                    key={timeEntry.id}
                    keywords={[timeEntry.description, getProjectById(timeEntry.pid)?.name || ""]}
                    title={timeEntry.description || "No description"}
                    subtitle={timeEntry.billable ? "$" : ""}
                    accessoryTitle={getProjectById(timeEntry?.pid)?.name}
                    accessoryIcon={{ source: Icon.Dot, tintColor: getProjectById(timeEntry?.pid)?.hex_color }}
                    icon={{ source: Icon.Circle, tintColor: getProjectById(timeEntry?.pid)?.hex_color }}
                    actions={
                      <ActionPanel>
                        <SubmitFormAction
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

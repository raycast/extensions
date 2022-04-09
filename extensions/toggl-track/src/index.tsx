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
  getPreferenceValues,
  Detail, 
  Color
} from "@raycast/api";
import { TimeEntry } from "./toggl/types";
import toggl from "./toggl";
import { storage } from "./storage";
import ProjectListItem from "./components/ProjectListItem";
import StartTimeEntryForm from "./components/StartTimeEntryForm";
import TimeEntryForm from "./components/TimeEntryForm";

interface Preferences {
  allowDelete: boolean;
}

const preferences: Preferences = getPreferenceValues();

dayjs.extend(duration);

function ListView() {
  const { isLoading, isValidToken, projectGroups, runningTimeEntry, timeEntries, projects } = useAppContext();
  const getProjectById = (id: number) => projects.find((p) => p.id === id);
  const timeEntriesWithUniqueProjectAndDescription = timeEntries.reduceRight((acc, timeEntry) => {
    const existing = acc.find((t) => (t.description === timeEntry.description && t.pid === timeEntry.pid) || timeEntry.stop == null );
    if (!existing) {
      acc.push(timeEntry);
    }
    return acc;
  }, [] as TimeEntry[]);

  async function resumeTimeEntry(timeEntry: TimeEntry) {
    await showToast(ToastStyle.Animated, "Starting timer...");
    try {
      await toggl.startTimeEntry({
        projectId: timeEntry.pid,
        description: timeEntry.description,
        tags: timeEntry.tags,
        billable: timeEntry.billable
      });
      await storage.runningTimeEntry.refresh();
      await showToast(ToastStyle.Success, "Time entry resumed");
      await clearSearchBar({ forceScrollToTop: true });
    } catch (e) {
      await showToast(ToastStyle.Failure, "Failed to resume time entry");
    }
  }

  async function deleteTimeEntry(timeEntry: TimeEntry) {
    await showToast(ToastStyle.Animated, "Deleting time entry...");
    try {
      await toggl.deleteTimeEntry({
        id: timeEntry.id,
      });
      await storage.timeEntries.refresh();
      await showToast(ToastStyle.Success, "Time entry deleted");
      await clearSearchBar({ forceScrollToTop: true });
    } catch (e) {
      await showToast(ToastStyle.Failure, "Failed to delete time entry");
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
                  title="Start a time entry"
                  icon={"command-icon.png"}
                  actions={
                    <ActionPanel>
                      <PushAction
                        title="Start Time Entry"
                        icon={{ source: Icon.Clock }}
                        target={
                          <AppContextProvider>
                            <StartTimeEntryForm />
                          </AppContextProvider>
                        }
                      />
                      <PushAction
                        title="Create Time Entry"
                        icon={{ source: Icon.Clock }}
                        target={
                          <AppContextProvider>
                            <TimeEntryForm />
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
                      accessoryTitle={timeEntry.billable ? "$ " : String(getProjectById(timeEntry?.pid)?.name)}
                      accessoryIcon={{ source: Icon.Dot, tintColor: getProjectById(timeEntry?.pid)?.hex_color }}
                      icon={{ source: Icon.Circle, tintColor: getProjectById(timeEntry?.pid)?.hex_color }}
                      actions={
                        <ActionPanel>
                          <SubmitFormAction
                            title="Resume Time Entry"
                            onSubmit={() => resumeTimeEntry(timeEntry)}
                            icon={{ source: Icon.Clock }}
                          />
                          <PushAction
                            title="Edit Time Entry"
                            icon={{ source: Icon.Clock }}
                            target={
                              <AppContextProvider>
                                <TimeEntryForm entry={timeEntry}/>
                              </AppContextProvider>
                            }
                          />
                          { preferences.allowDelete ?
                            <ActionPanel.Item
                              title="Delete Time Entry"
                              onAction={() => deleteTimeEntry(timeEntry)}
                              icon={{ source: Icon.Trash , tintColor: Color.Red}}
                              shortcut={{ modifiers: ["cmd"], key: "t" }}
                            /> : undefined
                          }
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

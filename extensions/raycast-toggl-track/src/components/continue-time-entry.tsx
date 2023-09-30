import { getPreferenceValues, Icon, ActionPanel, Action, Toast, showToast, List, showHUD } from "@raycast/api";
import { useState } from "react";
import ToggleClient from "../toggl/client";
import { ITimeEntry } from "toggl-track";
import { fetchRecentTimeEntries, createNewTimeEntryFromOldTimeEntry, hasTimeEntryRunning } from "../toggl/time-entries";
import { Project, fetchProjects, getProjectById } from "../toggl/project";
interface Preferences {
  togglAPIKey: string;
}

export default function ContinueTimeEntry() {
  const [timeEntries, settimeEntries] = useState<ITimeEntry[]>();
  const [projects, setProjects] = useState<Project[]>();
  const [activeEntry, setActiveEntry] = useState<ITimeEntry>();

  const preferences = getPreferenceValues<Preferences>();
  const client = ToggleClient(preferences.togglAPIKey);

  fetchRecentTimeEntries(client).then((timeEntries: ITimeEntry[]) => {
    fetchProjects(client).then((projects: Project[]) => {
      hasTimeEntryRunning(client).then((activeEntry) => {
        setProjects(projects);
        settimeEntries(timeEntries);
        setActiveEntry(activeEntry);
      });
    });
  });

  return (
    <List isLoading={timeEntries === undefined && projects === undefined}>
      {timeEntries?.map((timeEntry: ITimeEntry, index: number) => {
        const title = timeEntry.description;
        let subTitle = "";
        let icon = {
          source: Icon.Dot,
          tintColor: {
            light: "#cccccc",
            dark: "#cccccc",
            adjustContrast: true,
          },
        };

        if (projects) {
          const project = getProjectById(projects, timeEntry.project_id);
          if (project) {
            icon = {
              source: Icon.Dot,
              tintColor: {
                light: project.color,
                dark: project.color,
                adjustContrast: true,
              },
            };
            subTitle = project.name;
          }
        }
        return (
          <List.Item
            key={index}
            title={title}
            icon={icon}
            subtitle={subTitle}
            actions={
              <ActionPanel>
                <Action
                  title="Continue"
                  onAction={() => {
                    if (activeEntry === null) {
                      createNewTimeEntryFromOldTimeEntry(timeEntry, client)
                        .then((timeEntry) => {
                          showHUD("✅ Continuing - " + timeEntry.description);
                        })
                        .catch((reason) => {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to continue",
                            message: reason,
                          });
                        });
                    } else {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Active Time Entry Running",
                        message: activeEntry?.description + " is still running",
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

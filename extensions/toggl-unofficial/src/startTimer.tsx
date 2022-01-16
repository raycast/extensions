import { ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjects, getWorkspaceID, startTimer, getTimers } from "./toggl";

interface Timer {
  name: string;
  pid: number;
  project: string;
}

interface EntryFromAPI {
  id: number;
  wid: number;
  pid: number;
  billable: boolean;
  start: string;
  stop: string;
  duration: number;
  description: string;
  tags: Array<string>;
  at: string;
}

interface Project {
  id: number;
  wid: number;
  name: string;
  billable: boolean;
  is_private: boolean;
  active: boolean;
  template: boolean;
  at: string;
  created_at: string;
  color: string;
  auto_estimates: boolean;
  actual_hours: number;
  hex_color: string;
}

async function itemChosen(item: Timer) {
  const timeEntry = {
    name: item.name,
    project: item.pid,
  };
  await startTimer(timeEntry);
  await showHUD(`Timer for "${item.name}" started! 🎉`);
}

export default function Command() {
  const [timers, setTimers] = useState<Timer[]>();

  useEffect(() => {
    const getEntries = async () => {
      const data: Array<EntryFromAPI> = await getTimers();
      const fullData = data.reverse();
      const workspaceID: string = await getWorkspaceID();
      const projects: Array<Project> = await getProjects(workspaceID);
      const newTimers: Array<Timer> = [];

      fullData.forEach((entry: EntryFromAPI) => {
        const project = entry.pid;
        const description = entry.description;
        const timer: Timer = {
          name: description,
          pid: project,
          project: "",
        };
        projects.forEach((proj) => {
          if (proj.id == project) {
            timer.project = proj.name;
          }
        });
        const isAlreadyAdded = newTimers.some((item) => {
          return JSON.stringify(item) == JSON.stringify(timer);
        });
        if (!isAlreadyAdded) {
          newTimers.push(timer);
        }
      });
      setTimers(newTimers);
    };
    getEntries();
  }, []);

  return (
    <List isLoading={timers === undefined}>
      {timers?.map((timer, index) => (
        <List.Item
          key={index}
          icon={Icon.Clock}
          title={timer.name}
          accessoryTitle={timer.project}
          actions={
            <ActionPanel>
              <ActionPanel.Item title="Start Timer" onAction={() => itemChosen(timer)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

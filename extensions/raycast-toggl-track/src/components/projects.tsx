import { ActionPanel, Action, List, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";
import ToggleClient from "../toggl/client";
import { Project, fetchProjects } from "../toggl/project";

interface Preferences {
  togglAPIKey: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>();
  const preferences = getPreferenceValues<Preferences>();
  const client = ToggleClient(preferences.togglAPIKey);

  fetchProjects(client).then((projects: Project[]) => {
    setProjects(projects);
  });

  return (
    <List isLoading={projects === undefined}>
      {projects?.map((project: Project, index: number) => (
        <List.Item
          key={index}
          title={project.name}
          icon={{
            source: Icon.Dot,
            tintColor: {
              light: project.color,
              dark: project.color,
              adjustContrast: true,
            },
          }}
          actions={
            <ActionPanel title="Entry">
              <Action title="Start" onAction={() => console.log("Start")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

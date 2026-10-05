import { ActionPanel, Action, Icon, List } from "@raycast/api";
import type { Project } from "../types";
import { formatDate, usePenpotFetch } from "../utils";
import { useEffect, useState } from "react";
import { groupByTeam } from "./utils";

export default function Command() {
  const { isLoading, data: projects, revalidate } = usePenpotFetch<Project[]>("/get-all-projects", {});
  const [searchText, setSearchText] = useState("");
  const [filteredProjects, filterProjects] = useState<Project[]>([]);

  useEffect(() => {
    filterProjects(
      (projects || []).filter(
        (p) =>
          p.name.toLowerCase().includes(searchText.toLowerCase()) ||
          p.teamName.toLowerCase().includes(searchText.toLowerCase()),
      ),
    );
  }, [searchText]);

  const projectsPerTeam = groupByTeam(filteredProjects || []);
  const teamNames = Object.keys(projectsPerTeam);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarPlaceholder="Filter projects by name or team name"
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      {teamNames.map((teamName) => (
        <List.Section key={teamName} title={teamName}>
          {projectsPerTeam[teamName]
            .filter(
              (project) =>
                project.name.toLowerCase().includes(searchText.toLowerCase()) ||
                project.teamName.toLowerCase().includes(searchText.toLowerCase()),
            )
            .map((project) => (
              <List.Item
                key={project.id}
                title={project.name}
                icon={Icon.BlankDocument}
                accessories={[
                  { date: new Date(project.modifiedAt), tooltip: `Modified ${formatDate(project.modifiedAt)}` },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://design.penpot.app/#/dashboard/team/${project.teamId}/projects/${project.id}`}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

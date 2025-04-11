import { ActionPanel, Action, Icon, List } from "@raycast/api";
import type { Project } from "../types";
import { usePenpotFetch } from "../utils";
import { useEffect, useState } from "react";

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
      {filteredProjects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.teamName}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://design.penpot.app/#/dashboard/team/${project.teamId}/projects/${project.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

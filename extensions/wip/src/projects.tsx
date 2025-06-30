import { List, Detail, Toast, showToast, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { Project } from "./types";
import * as wip from "./oauth/wip";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchAndSetProjects = async () => {
      try {
        await wip.authorize();
        const fetchedProjects = await wip.fetchProjects();
        setProjects(fetchedProjects);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    };
    fetchAndSetProjects();
  }, []);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects…">
      {projects.map(
        (project) => (
          console.log(project),
          (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle={project.pitch}
              icon={project.logo.small}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={project.url} />
                  <Action.OpenInBrowser title="View Stats" url={`${project.url}/stats`} />
                  <Action.OpenInBrowser title="Edit Project" url={`${project.url}/edit`} />
                </ActionPanel>
              }
            />
          )
        ),
      )}
    </List>
  );
}

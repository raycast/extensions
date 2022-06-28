import { Action, ActionPanel, closeMainWindow, getPreferenceValues, List, LocalStorage, open } from "@raycast/api";
import fetch from "node-fetch";
import React, { useEffect, useState } from "react";

interface Preferences {
  envoyer_api_key: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function getProjects() {
      const response = await fetch("https://envoyer.io/api/projects", {
        headers: {
          Authorization: `Bearer ${preferences.envoyer_api_key}`,
        },
      });
      const data: { projects: Project[] } = (await response.json()) as { projects: Project[] };
      await LocalStorage.setItem("projects", JSON.stringify(data.projects));
      setProjects(data.projects);
      setLoading(false);
    }

    LocalStorage.getItem<string>("projects").then((projects) => {
      if (projects) {
        setProjects(JSON.parse(projects));
      }
    });

    getProjects();
  }, []);

  return (
    <List isLoading={loading}>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon="command-icon.png"
          title={project.name}
          subtitle={project.last_deployment_timestamp}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<ProjectDetails project={project} />} />
              <Action.OpenInBrowser url={`https://envoyer.io/projects/${project.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProjectDetails({ project }: { project: Project }) {
  const [loading, setLoading] = useState(false);

  return (
    <List navigationTitle={project.name} isLoading={loading}>
      <List.Item
        title="Overview"
        icon="command-icon.png"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={`https://envoyer.io/projects/${project.id}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title="View Last Deployment"
        icon="command-icon.png"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={`https://envoyer.io/projects/${project.id}/deployments/${project.last_deployment_id}`}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Start New Deployment"
        icon="command-icon.png"
        actions={
          <ActionPanel>
            <Action
              title="Start New Deployment"
              onAction={async () => {
                setLoading(true);
                await fetch(`https://envoyer.io/api/projects/${project.id}/deployments`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${getPreferenceValues().envoyer_api_key}`,
                  },
                });
                await open(`https://envoyer.io/projects/${project.id}`);
                await closeMainWindow();
                setLoading(false);
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@raycast/api";
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

      let data: { projects: Project[] } = { projects: [] };
      try {
        data = (await response.json()) as { projects: Project[] };
      } catch (e) {
        console.error(e);
      } finally {
        await LocalStorage.setItem("projects", JSON.stringify(data.projects));
        setProjects(data.projects);
        setLoading(false);
      }
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
      {projects.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No projects found"
          description="Make sure your API Key is valid and your account has projects"
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            icon="command-icon.png"
            title={project.name}
            subtitle={project.last_deployment_timestamp}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<ProjectDetails project={project} />} icon={Icon.List} />
                <Action.OpenInBrowser url={`https://envoyer.io/projects/${project.id}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ProjectDetails({ project: _project }: { project: Project }) {
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(_project);
  const [timestamp, setTimestamp] = useState(
    toHumanTime(project.deployment_started_at ? Date.parse(project.deployment_started_at) - Date.now() : -1)
  );

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      const project = await getProject();
      if (project) {
        setProject(project);
      }
      setLoading(false);
    }

    fetchProject();
  }, []);

  useEffect(() => {
    if (project.deployment_started_at === null) return;

    const interval = setInterval(() => {
      setTimestamp(toHumanTime(Date.parse(project.deployment_started_at) - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [project.deployment_started_at]);

  async function getProject(): Promise<Project | undefined> {
    const response = await fetch(`https://envoyer.io/api/projects/${project.id}`, {
      headers: {
        Authorization: `Bearer ${getPreferenceValues().envoyer_api_key}`,
      },
    });

    try {
      const data = (await response.json()) as { project: Project };
      return data.project;
    } catch (e) {
      console.error(e);
    }
  }

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
        title={project.status === "deploying" ? "View Current Deployment" : "View Last Deployment"}
        icon="command-icon.png"
        accessories={[
          {
            text:
              project.deployment_started_at !== null
                ? `Deployed ${timestamp} by ${project.last_deployment_author}`
                : `Last deployed ${project.last_deployment_timestamp} by ${project.last_deployment_author}`,
            icon: {
              source: project.last_deployment_avatar,
              mask: Image.Mask.Circle,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={`https://envoyer.io/projects/${project.id}/deployments/${project.last_deployment_id}`}
            />
          </ActionPanel>
        }
      />
      {project.status !== "deploying" && (
        <List.Item
          title="Start New Deployment"
          accessories={[
            {
              text: project.branch,
              icon: {
                tintColor: Color.SecondaryText,
                source: "branch.svg",
              },
            },
          ]}
          icon="command-icon.png"
          actions={
            <ActionPanel>
              <Action
                title="Start New Deployment"
                icon={{
                  source: {
                    light: "deploy.svg",
                    dark: "deploy-dark.svg",
                  },
                }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Deploying...",
                  });

                  await fetch(`https://envoyer.io/api/projects/${project.id}/deployments`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${getPreferenceValues().envoyer_api_key}`,
                    },
                  });

                  toast.style = Toast.Style.Success;
                  toast.title = "New deployment started!";

                  if (getPreferenceValues().open_on_deploy) {
                    await open(`https://envoyer.io/projects/${project.id}`);
                    await closeMainWindow();
                  } else {
                    setLoading(true);
                    for (let i = 0; i < 10; i++) {
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      const newProject = await getProject();
                      if (newProject !== undefined && project.last_deployment_id !== newProject.last_deployment_id) {
                        setProject(newProject);
                        break;
                      }
                    }
                    setLoading(false);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function toHumanTime(time: number) {
  const timeFormatter = new Intl.RelativeTimeFormat("en", { style: "long", numeric: "always" });
  // If there are minutes
  if (Math.abs(time) > 1000 * 60) {
    return timeFormatter.format(parseInt(String(time / (1000 * 60)), 10), "minutes");
  }

  return timeFormatter.format(parseInt(String(time / 1000), 10), "seconds");
}

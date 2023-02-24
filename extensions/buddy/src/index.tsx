import { useEffect, useState } from "react";
import { ActionPanel, List, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { BUDDY_API_URL } from "./config";

export default function Command() {
  const [error, setError] = useState<Error>();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [workspace, setWorkspace] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const { ACCESS_TOKEN } = getPreferenceValues();

  async function getWorkspaces() {
    const response = await fetch(`${BUDDY_API_URL}/workspaces`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    let data: { workspaces: IWorkspace[] } = { workspaces: [] };
    try {
      data = (await response.json()) as WorkspacesResponse;
    } catch (e) {
      setError(new Error("while fetching your workspaces"));
    } finally {
      setWorkspaces(data.workspaces);
    }
  }

  async function getProjects() {
    const response = await fetch(`${BUDDY_API_URL}/workspaces/${workspace}/projects?per_page=999`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    let data: { projects: IProject[] } = { projects: [] };
    try {
      data = (await response.json()) as ProjectsResponse;
    } catch (e) {
      setError(new Error("while fetching your projects"));
    } finally {
      setProjects(data.projects);
      setLoading(false);
    }
  }

  useEffect(() => {
    getWorkspaces();
  }, []);

  useEffect(() => {
    if (workspace === "") {
      return;
    }

    getProjects();
  }, [workspace]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Workspaces"
          onChange={(workspace) => {
            setWorkspace(workspace);
          }}
        >
          {workspaces.map((workspace, index) => {
            return <List.Dropdown.Item key={`workspace-${index}`} title={workspace.name} value={workspace.domain} />;
          })}
        </List.Dropdown>
      }
    >
      {projects.map((project, index) => {
        return (
          <List.Item
            key={`project-${index}`}
            title={project.name}
            actions={
              <ActionPanel title="Buddy">
                <Action.OpenInBrowser title="Pipelines" url={`${project.html_url}/pipelines`} />
                <Action.OpenInBrowser title="Sandboxes" url={`${project.html_url}/sb`} />
                <Action.OpenInBrowser title="Code" url={`${project.html_url}/`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

type ProjectsResponse = {
  project: string;
  html_url: string;
  projects: IProject[];
};

type WorkspacesResponse = {
  project: string;
  html_url: string;
  workspaces: IWorkspace[];
};

interface IProject {
  url: string;
  html_url: string;
  name: string;
  display_name: string;
  status: string;
}

interface IWorkspace {
  url: string;
  html_url: string;
  id: number;
  name: string;
  domain: string;
}

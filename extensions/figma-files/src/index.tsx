import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

export default function FileList() {
  const [state, setState] = useState<{ projectFiles: ProjectFiles[] }>({
    projectFiles: [],
  });

  useEffect(() => {
    async function fetch() {
      const projectFiles = await fetchFiles();

      setState((oldState) => ({
        ...oldState,
        projectFiles,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.projectFiles.length === 0} searchBarPlaceholder="Filter files by name...">
      {state.projectFiles.map((project) => (
        <List.Section key={project.name} title={project.name}>
          {project.files.map((file) => (
            <FileListItem key={file.key} file={file} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function FileListItem(props: { file: File }) {
  const { file } = props;

  return (
    <List.Item
      id={file.key}
      key={file.key}
      title={file.name}
      icon={file.thumbnail_url}
      accessoryTitle={new Date(file.last_modified).toLocaleDateString()}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://figma.com/file/${file.key}`} />
        </ActionPanel>
      }
    />
  );
}

async function fetchTeamProjects(): Promise<TeamProjects> {
  const { PERSONAL_ACCESS_TOKEN, TEAM_ID } = getPreferenceValues();
  try {
    const response = await fetch(`https://api.figma.com/v1/teams/${TEAM_ID}/projects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Figma-Token": PERSONAL_ACCESS_TOKEN,
      },
    });

    const json = (await response.json()) as TeamProjects;
    return json;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load team");
    return Promise.resolve({ name: "No team found", projects: [] });
  }
}

async function fetchFiles(): Promise<ProjectFiles[]> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();
  const teamProjects = await fetchTeamProjects();
  const projects = teamProjects.projects.map(async (project) => {
    try {
      const response = await fetch(`https://api.figma.com/v1/projects/${project.id}/files`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Figma-Token": PERSONAL_ACCESS_TOKEN,
        },
      });

      const json = (await response.json()) as ProjectFiles;
      return { name: project.name, files: json.files as File[] };
    } catch (error) {
      console.error(error);
      showToast(ToastStyle.Failure, "Could not load files");
      return Promise.resolve([]);
    }
  });

  return Promise.all(projects) as Promise<ProjectFiles[]>;
}

type Project = {
  id: string;
  name: string;
};

type TeamProjects = {
  name: string;
  projects: Project[];
};

type ProjectFiles = {
  files: File[];
  name: string;
};

type File = {
  key: string;
  last_modified: string;
  name: string;
  thumbnail_url: string;
};

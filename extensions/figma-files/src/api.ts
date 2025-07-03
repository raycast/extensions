import { LocalStorage, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { getAccessToken } from "@raycast/utils";
import fetch, { type RequestInit } from "node-fetch";
import type { FileDetail, ProjectFiles, TeamFiles, TeamProjects } from "./types";

async function request<T>(path: string, opts?: RequestInit) {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();
  const { token, type } = getAccessToken();

  const response = await fetch(`https://api.figma.com/v1${path}`, {
    headers: {
      ...opts?.headers,
      "Content-Type": "application/json",
      ...(type === "oauth" ? { Authorization: `Bearer ${token}` } : { "X-Figma-Token": PERSONAL_ACCESS_TOKEN }),
    },
    ...opts,
  });

  if (!response.ok) {
    return Promise.reject(response);
  }

  return response.json() as Promise<T>;
}

async function fetchTeamProjects(): Promise<TeamProjects[]> {
  const { TEAM_ID } = getPreferenceValues();
  const teamID: string[] = TEAM_ID.split(",").map((team: string) => team.toString().trim());

  try {
    return Promise.all(
      teamID.map((team) =>
        request<TeamProjects>(`/teams/${team}/projects`, {
          method: "GET",
        }),
      ),
    );
  } catch (error) {
    console.error(error);
    if (environment.launchType !== "background") {
      showToast(Toast.Style.Failure, "Could not load team projects");
    }
    return Promise.resolve([]);
  }
}

async function fetchFiles(): Promise<ProjectFiles[][]> {
  try {
    const teamProjects = await fetchTeamProjects();
    const teamNames = teamProjects.map((team) => team.name).join(",");
    await LocalStorage.setItem("teamNames", teamNames);

    const projectFiles = await Promise.all(
      teamProjects.map(async (team) => {
        const projects = await Promise.all(
          (team.projects || []).map(async (project) => {
            const result = await request<ProjectFiles>(`/projects/${project.id}/files?branch_data=true`, {
              method: "GET",
            });
            return { name: project.name, files: result.files ?? [] };
          }),
        );
        return projects;
      }),
    );

    return projectFiles;
  } catch (error) {
    console.error(error);
    if (environment.launchType !== "background") {
      showToast(Toast.Style.Failure, "Could not load files");
    }
    return [];
  }
}

export async function resolveAllFiles(): Promise<TeamFiles[]> {
  const teamFiles = await fetchFiles();
  const teams = ((await LocalStorage.getItem<string>("teamNames")) ?? "").split(",");
  const fi = teamFiles.map((projectFiles, index) => {
    return { name: teams[index], files: projectFiles } as TeamFiles;
  });
  return fi;
}

export async function fetchPages(fileKey: string) {
  try {
    const json = await request<FileDetail>(`/files/${fileKey}?depth=1`, {
      method: "GET",
    });
    return json.document.children;
  } catch (error) {
    console.error(error);
    if (environment.launchType !== "background") {
      showToast(Toast.Style.Failure, "Could not load pages (Figma Slides not supported)");
    }
    return Promise.resolve([]);
  }
}

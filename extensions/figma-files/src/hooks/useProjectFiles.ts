import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch, { Response } from "node-fetch";
import { useState, useEffect } from "react";

import { File, ProjectFiles, TeamProjects } from "../types";
import { loadFiles, storeFiles } from "../cache";

export function useProjectFiles() {
  const [state, setState] = useState<{
    projectFiles?: ProjectFiles[];
    isLoading: boolean;
    hasError: boolean;
  }>({
    projectFiles: undefined,
    isLoading: true,
    hasError: false,
  });

  useEffect(() => {
    async function fetch() {
      const cachedFiles = await loadFiles();
      if (cachedFiles) {
        setState((oldState) => ({ ...oldState, projectFiles: cachedFiles }));
      }

      try {
        const newFiles = await fetchFiles();

        setState((oldState) => ({
          ...oldState,
          projectFiles: newFiles,
          isLoading: false,
          hasError: false,
        }));

        await storeFiles(newFiles);
      } catch (error) {
        console.error("error fetching files", error);
        if ((error as Response)?.status >= 400) {
          setState((oldState) => ({
            ...oldState,
            projectFiles: [],
            isLoading: false,
            hasError: true,
          }));
        }
      }
    }
    fetch();
  }, []);

  return state;
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

    if (!response.ok) {
      return Promise.reject(response);
    }

    const json = (await response.json()) as TeamProjects;
    return json;
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, "Could not load team");
    return Promise.resolve({ name: "No team found", projects: [] });
  }
}

async function fetchFiles(): Promise<ProjectFiles[]> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();
  const teamProjects = await fetchTeamProjects();
  const projects = (teamProjects.projects || []).map(async (project) => {
    try {
      const response = await fetch(`https://api.figma.com/v1/projects/${project.id}/files`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Figma-Token": PERSONAL_ACCESS_TOKEN,
        },
      });

      const json = (await response.json()) as ProjectFiles;
      return { name: project.name, files: (json.files || []) as File[] };
    } catch (error) {
      console.error(error);
      showToast(Toast.Style.Failure, "Could not load files");
      return Promise.resolve([]);
    }
  });

  return Promise.all(projects) as Promise<ProjectFiles[]>;
}

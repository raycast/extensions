import { getPreferenceValues, showToast, Toast, LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { File, ProjectFiles, TeamFiles, TeamProjects } from "../types";

async function fetchTeamProjects(): Promise<TeamProjects[]> {
  const { PERSONAL_ACCESS_TOKEN, TEAM_ID } = getPreferenceValues();

  const teamID: string[] = TEAM_ID.split(",").map((team: string) => team.toString().trim());
  const teams = teamID.map(async (team) => {
    try {
      const response = await fetch(`https://api.figma.com/v1/teams/${team}/projects`, {
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
  });
  return Promise.all(teams) as Promise<TeamProjects[]>;
}

async function fetchFiles(): Promise<ProjectFiles[][]> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();
  const teamProjects = await fetchTeamProjects();
  const teamNames = teamProjects.map((team) => team.name).join(",");
  await LocalStorage.setItem("teamNames", teamNames);
  const teamFiles = teamProjects.map(async (team) => {
    //fetch all files for each project of a team
    const projects = (team.projects || []).map(async (project) => {
      try {
        const response = await fetch(`https://api.figma.com/v1/projects/${project.id}/files?branch_data=true`, {
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
  });
  return Promise.all(teamFiles);
}

export async function resolveAllFiles(): Promise<TeamFiles[]> {
  const teamFiles = await fetchFiles();
  const teams = ((await LocalStorage.getItem<string>("teamNames")) || "").split(",");
  const fi = teamFiles.map((projectFiles, index) => {
    return { name: teams[index], files: projectFiles } as TeamFiles;
  });
  return fi;
}

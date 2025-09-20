import { ProjectsClient } from "@google-cloud/resource-manager";
import { getPreferenceValues } from "@raycast/api";
import { Project } from "./types";

const client = new ProjectsClient({ fallback: true });

export async function fetchProjects() {
  const projects = [];
  const { skipSysPrefixedProjects } = getPreferenceValues<Preferences>();

  for await (const project of client.searchProjectsAsync()) {
    if (!project.name || !project.projectId) {
      continue;
    }

    if (skipSysPrefixedProjects && project.projectId.startsWith("sys-")) {
      continue;
    }

    projects.push(project);
  }

  return projects as Project[];
}

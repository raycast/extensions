import useSWR from "swr";
import { ProjectsClient } from "@google-cloud/resource-manager";
import { Project } from "./types";

const client = new ProjectsClient();

async function fetchProjects() {
  const projects = [];

  for await (const project of client.searchProjectsAsync()) {
    if (project.name && project.projectId) {
      projects.push(project);
    }
  }

  return projects as Project[];
}

export function useProjects() {
  return useSWR("projects", fetchProjects);
}

import { useEffect, useState } from "react";

import {
  addProject,
  ensureDemoProject,
  getActiveProjectId,
  getProjects,
  removeProject,
  setActiveProjectId,
} from "../lib/storage";
import { ProjectInput, StripeProject } from "../lib/types";

export function useProjects() {
  const [projects, setProjects] = useState<StripeProject[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    setIsLoading(true);

    const [storedProjects, storedActiveProjectId] = await Promise.all([
      getProjects(),
      getActiveProjectId(),
    ]);

    setProjects(storedProjects);
    setActiveProjectIdState(
      storedActiveProjectId ?? storedProjects[0]?.id ?? null,
    );
    setIsLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function saveProject(input: ProjectInput) {
    const project = await addProject(input);
    await reload();
    return project;
  }

  async function activateProject(projectId: string) {
    await setActiveProjectId(projectId);
    setActiveProjectIdState(projectId);
  }

  async function deleteProject(projectId: string) {
    await removeProject(projectId);
    await reload();
  }

  async function enableDemoProject() {
    const project = await ensureDemoProject();
    await reload();
    return project;
  }

  return {
    projects,
    activeProject:
      projects.find((project) => project.id === activeProjectId) ?? null,
    isLoading,
    reload,
    saveProject,
    activateProject,
    deleteProject,
    enableDemoProject,
  };
}

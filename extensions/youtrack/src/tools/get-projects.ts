import { handleOnCatchError } from "../api/errors-helper";
import { YouTrackApi } from "../api/youtrack-api";
import { loadCache, saveCache } from "../cache";
import type { Project } from "../interfaces";

const MAX_PROJECTS = 10;

type Input = {
  /**
   * The project short name, e.g. `DEMO`
   */
  project?: string;
};

/**
 * Reads projects from the cache, or fetches them from YouTrack if not present.
 */
export default async function getProjects(input: Input) {
  const api = YouTrackApi.getInstance();
  try {
    const projects = await loadCache<Project>("youtrack-projects");
    if (!projects.length || !input.project) {
      const fetchedProjects = await api.fetchProjects(MAX_PROJECTS);
      await saveCache("youtrack-projects", fetchedProjects);
    } else if (!projects.find(({ shortName }) => shortName === input.project)) {
      const project = await api.fetchProjectById(input.project);
      projects.push(project);
      await saveCache("youtrack-projects", projects);
    }
    return projects;
  } catch (error) {
    handleOnCatchError(error, "Error fetching projects");
  }
}

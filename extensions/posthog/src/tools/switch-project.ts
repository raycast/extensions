import { Tool } from "@raycast/api";

import { PostHogAPIError } from "../api/client";
import { getProject, listProjects } from "../api/projects";
import { setActiveProjectId } from "./_shared";

type Input = {
  /** The numeric project ID to switch to. Get this from `projects-get`. */
  projectId: number;
};

export default async function (input: Input) {
  // Best-effort verify the project exists. If the key is project-scoped and can't list projects,
  // we still allow the switch — the user knows their key has access to this project.
  try {
    await getProject(input.projectId);
  } catch (e) {
    if (!(e instanceof PostHogAPIError) || e.status < 500) throw e;
  }
  await setActiveProjectId(input.projectId);
  return { activeProjectId: input.projectId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  let label = `#${input.projectId}`;
  try {
    const projects = await listProjects();
    const match = projects.results.find((p) => p.id === input.projectId);
    if (match) label = match.name;
  } catch {
    /* listing may fail for project-scoped keys; we'll show the ID instead */
  }
  return {
    message: `Switch active project to "${label}"?`,
    info: [{ name: "Project", value: label }],
  };
};

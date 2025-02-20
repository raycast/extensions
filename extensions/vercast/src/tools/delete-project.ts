import { deleteProjectById, fetchProjects } from "../vercel";

type Input = {
  projectId: string;
  teamId?: string;
};

export default async function deleteProject({ projectId, teamId }: Input) {
  return deleteProjectById(projectId, teamId);
}

export const confirmation = async ({ projectId, teamId }: Input) => {
  const projects = await fetchProjects(teamId);

  const project = projects.find((p) => p.id === projectId);
  return {
    message: `Are you sure you want to delete the project?`,
    info: [{ name: project?.name || "Project", value: project?.id }],
  };
};

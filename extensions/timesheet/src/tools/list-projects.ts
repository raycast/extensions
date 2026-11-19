import { getProjects } from "../api";

type Input = {
  /**
   * Only return projects whose title or client contains this text,
   * matched case-insensitively. Use it to resolve a project name to an ID.
   */
  search?: string;
  /**
   * Include archived projects. Defaults to false, which returns active projects only.
   */
  includeArchived?: boolean;
};

export default async function tool(input: Input) {
  const projects = await getProjects({
    status: input.includeArchived ? "all" : "active",
  });

  const needle = input.search?.trim().toLowerCase();
  const matches = needle
    ? projects.filter((project) =>
        `${project.title} ${project.titleAndClient ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : projects;

  return matches.map((project) => ({
    id: project.id,
    title: project.title,
    client: project.employer,
    team: project.team?.name,
    archived: project.archived ?? false,
    openTodos: project.todoCount,
  }));
}

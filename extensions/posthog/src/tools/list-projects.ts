import { listProjects } from "../posthog-client";

type Input = {
  search?: string;
  limit?: number;
};

export default async function tool({ search, limit }: Input = {}) {
  const response = await listProjects(search, limit);

  return {
    count: response.count,
    next: response.next,
    projects: (response.results ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      uuid: project.uuid,
      timezone: project.timezone,
      organization: project.organization ? { id: project.organization.id, name: project.organization.name } : undefined,
    })),
  };
}

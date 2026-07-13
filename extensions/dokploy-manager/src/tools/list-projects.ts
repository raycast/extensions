import { listProjects } from "../api/dokploy-api";
import { loadServices, requireClient, summarizeService } from "../lib/ai";

type Input = {
  /** Name of the Dokploy account to query. Defaults to the active one. */
  account?: string;
};

/** Every project on the instance, with the services in each one and their current status. */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  // Two calls, but `loadServices` is the one that fills in the databases Dokploy sends bare.
  const [projects, services] = await Promise.all([listProjects(client), loadServices(client)]);

  return {
    account: client.account.label,
    projects: projects.map((project) => ({
      id: project.projectId,
      name: project.name,
      description: project.description ?? undefined,
      services: services
        .filter((service) => service.projectId === project.projectId)
        .map((service) => summarizeService(service)),
    })),
  };
}

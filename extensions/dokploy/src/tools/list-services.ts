import { loadServices, requireClient, summarizeService } from "../lib/ai";
import { ServiceKind, ServiceStatus } from "../types/dokploy";

type Input = {
  /** Name of the Dokploy account to query. Defaults to the active one. */
  account?: string;
  /** Only return services of this type. */
  kind?: ServiceKind;
  /** Only return services in projects whose name contains this. */
  project?: string;
  /** Only return services in this state. Use "error" to find what is broken. */
  status?: ServiceStatus;
};

/**
 * Every service across the instance, optionally filtered. This is the tool to reach for on
 * questions like "is anything down?" (status: "error") or "list the databases" (kind: "postgres").
 */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  let services = await loadServices(client);

  if (input.kind) {
    services = services.filter((service) => service.kind === input.kind);
  }
  if (input.project) {
    const project = input.project.toLowerCase();
    services = services.filter((service) => service.projectName.toLowerCase().includes(project));
  }
  if (input.status) {
    services = services.filter((service) => service.status === input.status);
  }

  return {
    account: client.account.label,
    count: services.length,
    services: services.map(summarizeService),
  };
}

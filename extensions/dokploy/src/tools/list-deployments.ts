import { listDeployments } from "../api/dokploy-api";
import { requireClient, resolveService } from "../lib/ai";
import { hasDeployments, serviceKindConfig } from "../lib/service-kinds";
import { ServiceKind } from "../types/dokploy";

type Input = {
  /** Name or id of the application or compose stack. */
  service: string;
  /** How many of the most recent deployments to return. Defaults to 10. */
  limit?: number;
  /** Narrows the lookup when several projects have a service with the same name. */
  project?: string;
  /** Narrows the lookup to one type of service. */
  kind?: ServiceKind;
  /** Name of the Dokploy account. Defaults to the active one. */
  account?: string;
};

/**
 * The build history of an application or compose stack: what was deployed, when, and whether it
 * failed. Each entry carries a `deploymentId` to pass to the build-log tool.
 */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });

  if (!hasDeployments(service.kind)) {
    const label = serviceKindConfig(service.kind).label;
    throw new Error(`${label} services have no build history in Dokploy - only applications and compose stacks do.`);
  }

  const deployments = await listDeployments(client, service);
  const limit = input.limit ?? 10;

  return {
    service: service.name,
    project: service.projectName,
    deployments: deployments.slice(0, limit).map((deployment) => ({
      deploymentId: deployment.deploymentId,
      title: deployment.title,
      description: deployment.description ?? undefined,
      status: deployment.status ?? "unknown",
      startedAt: deployment.createdAt,
      finishedAt: deployment.finishedAt ?? undefined,
      errorMessage: deployment.errorMessage ?? undefined,
      // Only builds that produced a restore point can be rolled back to.
      canRollBack: Boolean(deployment.rollbackId),
    })),
  };
}

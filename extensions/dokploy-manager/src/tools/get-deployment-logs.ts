import { listDeployments, readDeploymentLogs } from "../api/dokploy-api";
import { requireClient, resolveService } from "../lib/ai";
import { hasDeployments, serviceKindConfig } from "../lib/service-kinds";
import { ServiceKind } from "../types/dokploy";

const MAX_LINES = 500;
const DEFAULT_LINES = 200;

type Input = {
  /**
   * The deployment to read. Get one from the deployment list, or omit it together with `service`
   * to read that service's most recent build.
   */
  deploymentId?: string;
  /** Name or id of the service, used when `deploymentId` is not given. */
  service?: string;
  /** How many lines from the end of the build log to read. Defaults to 200, capped at 500. */
  lines?: number;
  /** Narrows the lookup when several projects have a service with the same name. */
  project?: string;
  /** Narrows the lookup to one type of service. */
  kind?: ServiceKind;
  /** Name of the Dokploy account. Defaults to the active one. */
  account?: string;
};

/**
 * The build log of a deployment - the thing to read when a deploy failed.
 *
 * Passing just a service name reads its latest build, which is what "why did the deploy fail?"
 * almost always means.
 */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  const tail = Math.min(input.lines ?? DEFAULT_LINES, MAX_LINES);

  if (input.deploymentId) {
    const logs = await readDeploymentLogs(client, input.deploymentId, tail);
    return {
      deploymentId: input.deploymentId,
      logs: logs.trim() || "(no build output)",
    };
  }

  if (!input.service) {
    throw new Error("Provide either a deploymentId or a service name.");
  }

  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });

  if (!hasDeployments(service.kind)) {
    const label = serviceKindConfig(service.kind).label;
    throw new Error(`${label} services have no build logs - only applications and compose stacks do.`);
  }

  const deployments = await listDeployments(client, service);
  const latest = deployments[0];

  if (!latest) {
    throw new Error(`${service.name} has never been deployed, so there is no build log.`);
  }

  const logs = await readDeploymentLogs(client, latest.deploymentId, tail);

  return {
    service: service.name,
    project: service.projectName,
    deploymentId: latest.deploymentId,
    title: latest.title,
    status: latest.status ?? "unknown",
    startedAt: latest.createdAt,
    errorMessage: latest.errorMessage ?? undefined,
    logs: logs.trim() || "(no build output)",
  };
}

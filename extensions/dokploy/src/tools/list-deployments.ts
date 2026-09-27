import { DeployType, resolveCandidate } from "../candidates";
import { Deployment, ENDPOINTS, ID_FIELDS, DeployableKind, sortDeploymentsByRecency } from "../deployment-history";
import { parseTrpcJsonResponse, trpcQueryUrl } from "../trpc";

type Input = {
  /** Name or id of the application or compose stack. */
  service: string;
  /** How many of the most recent deployments to return. Defaults to 10. */
  limit?: number;
  /** Narrows the lookup when more than one project has a service with this name. */
  project?: string;
  /** Narrows the lookup to one kind of service. */
  kind?: DeployType;
  /** Narrows the lookup to one configured instance, by name. */
  instance?: string;
};

function isDeployable(deployType: string): deployType is DeployableKind {
  return deployType === "application" || deployType === "compose";
}

/**
 * The build history of an application or compose stack: what was deployed, when, and whether it
 * failed. Each entry's `deploymentId` can be passed to `get-deployment-logs`.
 */
export default async function tool(input: Input) {
  const candidate = await resolveCandidate(input.service, {
    instance: input.instance,
    project: input.project,
    kind: input.kind,
  });

  if (!isDeployable(candidate.deployType)) {
    throw new Error(
      `${candidate.name} is a ${candidate.deployType} service - only applications and compose stacks have a build history in Dokploy.`,
    );
  }

  const response = await fetch(
    trpcQueryUrl(candidate.url, ENDPOINTS[candidate.deployType], { [ID_FIELDS[candidate.deployType]]: candidate.id }),
    { headers: candidate.headers },
  );
  const deployments = sortDeploymentsByRecency(await parseTrpcJsonResponse<Deployment[]>(response));
  const limit = Number.isInteger(input.limit) && input.limit! > 0 ? input.limit! : 10;

  return {
    service: candidate.name,
    deployments: deployments.slice(0, limit).map((deployment) => ({
      deploymentId: deployment.deploymentId,
      title: deployment.title,
      description: deployment.description ?? undefined,
      status: deployment.status,
      createdAt: deployment.createdAt,
      errorMessage: deployment.errorMessage ?? undefined,
      // Only a build that produced a restore point can be rolled back to.
      canRollBack: Boolean(deployment.rollbackId),
    })),
  };
}

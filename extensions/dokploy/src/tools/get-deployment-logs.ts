import { DeployType, resolveCandidate } from "../candidates";
import { Deployment, ENDPOINTS, ID_FIELDS, DeployableKind } from "../deployment-history";
import { parseTrpcJsonResponse, parseTrpcTextResponse, trpcQueryUrl } from "../trpc";

const MAX_LINES = 500;
const DEFAULT_LINES = 200;

type Input = {
  /** Name or id of the application or compose stack. */
  service: string;
  /** Reads this specific deployment's build log instead of the latest one - get an id from `list-deployments`. */
  deploymentId?: string;
  /** How many lines from the end of the build log to read. Defaults to 200, capped at 500. */
  lines?: number;
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
 * The build log of a deployment - what to read when a deploy failed. Passing just a service name
 * reads its latest build, which is what "why did the deploy for X fail?" almost always means.
 */
export default async function tool(input: Input) {
  const candidate = await resolveCandidate(input.service, {
    instance: input.instance,
    project: input.project,
    kind: input.kind,
  });
  if (!isDeployable(candidate.deployType)) {
    throw new Error(
      `${candidate.name} is a ${candidate.deployType} service - only applications and compose stacks have build logs in Dokploy.`,
    );
  }
  const tail = Math.min(input.lines ?? DEFAULT_LINES, MAX_LINES);

  let deploymentId = input.deploymentId;
  let deployment: Deployment | undefined;

  if (!deploymentId) {
    const listResponse = await fetch(
      trpcQueryUrl(candidate.url, ENDPOINTS[candidate.deployType], { [ID_FIELDS[candidate.deployType]]: candidate.id }),
      { headers: candidate.headers },
    );
    const deployments = await parseTrpcJsonResponse<Deployment[]>(listResponse);
    deployment = deployments[0];
    if (!deployment) throw new Error(`${candidate.name} has never been deployed, so there is no build log.`);
    deploymentId = deployment.deploymentId;
  }

  const logResponse = await fetch(trpcQueryUrl(candidate.url, "deployment.readLogs", { deploymentId, tail }), {
    headers: candidate.headers,
  });
  const logs = await parseTrpcTextResponse(logResponse);

  return {
    service: candidate.name,
    deploymentId,
    title: deployment?.title,
    status: deployment?.status,
    createdAt: deployment?.createdAt,
    errorMessage: deployment?.errorMessage ?? undefined,
    logs: logs.trim() || "(no build output)",
  };
}

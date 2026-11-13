import { Action, Tool } from "@raycast/api";
import { Candidate, DeployType, resolveCandidate } from "../candidates";
import { assertConfirmedCandidate, rememberConfirmedCandidate } from "../confirmed-candidate";
import { callServiceAction } from "../service-actions";

type Input = {
  /** Name or id of the service to deploy, e.g. "api". */
  service: string;
  /** Narrows the lookup when more than one project has a service with this name. */
  project?: string;
  /** Narrows the lookup when one project has a service with this name in more than one environment, e.g. "staging". */
  environment?: string;
  /** Narrows the lookup to one kind of service. */
  kind?: DeployType;
  /** Narrows the lookup to one configured instance, by name. */
  instance?: string;
};

function lookup(input: Input) {
  return resolveCandidate(input.service, {
    instance: input.instance,
    project: input.project,
    environment: input.environment,
    kind: input.kind,
  });
}

function isBuiltFromSource(candidate: Candidate) {
  return candidate.deployType === "application" || candidate.deployType === "compose";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const candidate = await lookup(input);
  await rememberConfirmedCandidate("deploy-service", input, candidate);
  return {
    style: Action.Style.Regular,
    message: isBuiltFromSource(candidate)
      ? `Deploy ${candidate.name}? This pulls its latest source, builds it, and replaces what is currently running.`
      : `Deploy ${candidate.name}? This pulls its image and restarts the database with its current settings. Its data is kept.`,
    info: [
      { name: "Service", value: candidate.name },
      { name: "Kind", value: candidate.deployType },
      { name: "Project", value: `${candidate.projectName} / ${candidate.environmentName}` },
      { name: "Instance", value: candidate.instanceName },
    ],
  };
};

/**
 * Deploys a service: an application or compose stack is rebuilt from its latest source, a database
 * is restarted from its image with its data kept. Never rebuilds a database from scratch - that
 * deletes its data volume, so it's left to the Services command.
 */
export default async function tool(input: Input) {
  const candidate = await lookup(input);
  await assertConfirmedCandidate("deploy-service", input, candidate);

  await callServiceAction(
    candidate.url,
    candidate.headers,
    { id: candidate.id, type: candidate.deployType, name: candidate.name, appName: candidate.appName },
    "deploy",
  );

  return {
    service: candidate.name,
    kind: candidate.deployType,
    instance: candidate.instanceName,
    project: candidate.projectName,
    environment: candidate.environmentName,
    // Dokploy queues application/compose builds and returns immediately, but deploys a database
    // synchronously, so only the former is still in progress here.
    message: isBuiltFromSource(candidate)
      ? `Deployment queued for ${candidate.name}. The build runs on the server - use list-deployments or get-deployment-logs to see how it went.`
      : `${candidate.name} was deployed.`,
  };
}

import { DeployType, loadCandidates, matchesFilter } from "../candidates";

type Input = {
  /** Only return services on this configured instance, matched case-insensitively against its name. */
  instance?: string;
  /** Only return services in projects whose name contains this, case-insensitively. */
  project?: string;
  /** Only return services of this kind. */
  kind?: DeployType;
};

/**
 * Every application, database, and compose stack across the configured instance(s), optionally
 * filtered. The tool to reach for "what's in project X", "list the databases", or "what's running
 * on staging". For whether a specific deploy failed, use `list-deployments` instead - this only
 * reflects a service's own resting state, not its build history.
 */
export default async function tool(input: Input) {
  const { candidates, failedInstances, hasInstances } = await loadCandidates();
  if (!hasInstances) throw new Error("No Dokploy instances are configured in this extension yet.");

  const services = candidates.filter((candidate) => matchesFilter(candidate, input));

  return {
    count: services.length,
    services: services.map((candidate) => ({
      name: candidate.name,
      kind: candidate.deployType,
      status: candidate.status,
      instance: candidate.instanceName,
      project: candidate.projectName,
      environment: candidate.environmentName,
    })),
    failedInstances: failedInstances.length > 0 ? failedInstances : undefined,
  };
}

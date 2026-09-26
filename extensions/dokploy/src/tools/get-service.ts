import { DeployType, resolveCandidate } from "../candidates";
import { Domain, ErrorResult } from "../interfaces";
import { domainUrl } from "../service-domains";

type Input = {
  /** Name or id of the service, e.g. "api". */
  service: string;
  /** Narrows the lookup when more than one project has a service with this name. */
  project?: string;
  /** Narrows the lookup to one kind of service. */
  kind?: DeployType;
  /** Narrows the lookup to one configured instance, by name. */
  instance?: string;
};

// Only applications and compose stacks can have a domain - the five database kinds cannot.
const DOMAIN_ENDPOINTS: Partial<Record<string, { endpoint: string; idField: string }>> = {
  application: { endpoint: "domain.byApplicationId", idField: "applicationId" },
  compose: { endpoint: "domain.byComposeId", idField: "composeId" },
};

/**
 * The returned fields are an allowlist - Dokploy's own detail route also carries `env`,
 * `buildSecrets`, and (for databases) credentials, none of which belong in a tool result the model
 * reads back to the user.
 */
interface ServiceDetail {
  description?: string | null;
  buildType?: string | null;
  sourceType?: string | null;
  repository?: string | null;
  owner?: string | null;
  branch?: string | null;
  dockerImage?: string | null;
  replicas?: number | null;
  autoDeploy?: boolean | null;
}

/**
 * Details of one service: what it builds from, its domains, and its current status. Use
 * `list-services` first if this name doesn't resolve to exactly one match.
 */
export default async function tool(input: Input) {
  const candidate = await resolveCandidate(input.service, {
    instance: input.instance,
    project: input.project,
    kind: input.kind,
  });

  const detailResponse = await fetch(
    `${candidate.url}${candidate.deployType}.one?${candidate.idField}=${candidate.id}`,
    {
      headers: candidate.headers,
    },
  );
  if (!detailResponse.ok) {
    const err = (await detailResponse.json().catch(() => undefined)) as ErrorResult | undefined;
    throw new Error(err?.message ?? `Could not load ${candidate.name}'s details (${detailResponse.status}).`);
  }
  const detail = (await detailResponse.json()) as ServiceDetail;

  const domainConfig = DOMAIN_ENDPOINTS[candidate.deployType];
  let domains: Domain[] = [];
  if (domainConfig) {
    const domainsResponse = await fetch(
      `${candidate.url}${domainConfig.endpoint}?${domainConfig.idField}=${candidate.id}`,
      {
        headers: candidate.headers,
      },
    );
    if (domainsResponse.ok) domains = (await domainsResponse.json()) as Domain[];
  }

  return {
    name: candidate.name,
    kind: candidate.deployType,
    status: candidate.status,
    instance: candidate.instanceName,
    project: candidate.projectName,
    environment: candidate.environmentName,
    containerName: candidate.appName,
    description: detail.description || undefined,
    buildType: detail.buildType ?? undefined,
    source:
      candidate.deployType === "application"
        ? {
            type: detail.sourceType ?? undefined,
            repository: detail.repository ?? undefined,
            owner: detail.owner ?? undefined,
            branch: detail.branch ?? undefined,
            dockerImage: detail.dockerImage ?? undefined,
          }
        : undefined,
    replicas: detail.replicas ?? undefined,
    autoDeploy: detail.autoDeploy ?? undefined,
    domains: domains.map((domain) => ({
      host: domain.host,
      url: domainUrl(domain),
      enabled: domain.enabled ?? true,
    })),
  };
}

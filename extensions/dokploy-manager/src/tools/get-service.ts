import { getService, listDomains } from "../api/dokploy-api";
import { requireClient, resolveService, summarizeService } from "../lib/ai";
import { hasDeployments } from "../lib/service-kinds";
import { serviceUrl } from "../lib/urls";
import { Application, Compose, ServiceKind } from "../types/dokploy";

type Input = {
  /** Name or id of the service, e.g. "api". */
  service: string;
  /** Narrows the lookup when several projects have a service with the same name. */
  project?: string;
  /** Narrows the lookup to one type of service. */
  kind?: ServiceKind;
  /** Name of the Dokploy account to query. Defaults to the active one. */
  account?: string;
};

/**
 * Details of a single service: where it builds from, what domains point at it, and its status.
 *
 * The returned fields are an allowlist. Dokploy's detail routes also carry `env`, `buildSecrets`
 * and database passwords, and those must not reach the model - see `summarizeService`.
 */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });

  const [raw, domains] = await Promise.all([
    getService(client, service.kind, service.id),
    listDomains(client, service),
  ]);
  const detail = raw as Application & Compose;

  return {
    ...summarizeService(service),
    // The detail route knows the live status; the project tree may be a moment behind.
    status: detail.applicationStatus ?? detail.composeStatus ?? service.status ?? "unknown",
    containerName: detail.appName,
    source: {
      type: detail.sourceType,
      repository: detail.repository ?? undefined,
      owner: detail.owner ?? undefined,
      branch: detail.branch ?? undefined,
      dockerImage: detail.dockerImage ?? undefined,
    },
    buildType: detail.buildType,
    replicas: detail.replicas,
    autoDeploy: detail.autoDeploy ?? undefined,
    domains: domains.map((domain) => ({
      host: domain.host,
      url: `${domain.https ? "https" : "http"}://${domain.host}${domain.path ?? ""}`,
      port: domain.port ?? undefined,
    })),
    hasBuildHistory: hasDeployments(service.kind),
    dashboardUrl: serviceUrl(client.webUrl, service),
  };
}

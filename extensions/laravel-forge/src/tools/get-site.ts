import { deploymentStatus } from "../api/Site";
import { serverRecord, siteRecord } from "../lib/records";
import { forgeLink, forgeSiteUrl } from "../lib/url";
import { siteLinks } from "./fields";

type Input = {
  /**
   * A site id from list-sites, for example 2882133.
   */
  siteId: number;
};

const answered = (fields: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, value ?? null]));

export default async function tool({ siteId }: Input) {
  const { site: found, serverId } = await siteRecord(siteId, { withDeployment: true });
  const { server } = await serverRecord(serverId);
  const deployment = found.latest_deployment;

  return answered({
    id: found.id,
    name: found.name,
    server: { id: server.id, name: server.name },
    url: found.url,
    aliases: found.aliases,
    status: found.status,
    phpVersion: found.php_version,
    appType: found.app_type,
    user: found.user,
    isolated: found.isolated,
    https: found.https,
    wildcards: found.wildcards,
    webDirectory: found.web_directory,
    rootDirectory: found.root_directory,
    sharedPaths: found.shared_paths,
    database: found.database,
    repository: found.repository,
    quickDeploy: found.quick_deploy,
    zeroDowntimeDeployments: found.zero_downtime_deployments,
    deploymentRetention: found.deployment_retention,
    usesEnvoyer: found.uses_envoyer,
    deploymentStatus: deploymentStatus(found.deployment_status) ?? deploymentStatus(deployment?.status),
    maintenanceMode: found.maintenance_mode,
    healthcheckUrl: found.healthcheck_url,
    createdAt: found.created_at,
    updatedAt: found.updated_at,
    forgeUrl: forgeLink(forgeSiteUrl(server, found.id), `${found.name} on Forge`),
    ...siteLinks(server, found.id),
    latestDeployment: deployment && {
      id: deployment.id,
      status: deployment.status,
      startedAt: deployment.started_at,
      endedAt: deployment.ended_at,
      commit: deployment.commit?.hash,
      branch: deployment.commit?.branch,
      message: deployment.commit?.message,
    },
  });
}

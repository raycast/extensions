import { findSite, siteDeploymentStatus } from "./helpers";

type Input = {
  /**
   * The site's id as a string, for example "2882133", or its exact name.
   */
  site: string;
};

// deployment_url embeds a token that triggers a deploy with no auth
export default async function tool({ site }: Input) {
  const { site: found, server } = await findSite(site);
  const deployment = found.latest_deployment;
  return {
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
    deploymentStatus: siteDeploymentStatus(found),
    deploymentScript: found.deployment_script,
    maintenanceMode: found.maintenance_mode,
    healthcheckUrl: found.healthcheck_url,
    createdAt: found.created_at,
    updatedAt: found.updated_at,
    latestDeployment: deployment && {
      id: deployment.id,
      status: deployment.status,
      startedAt: deployment.started_at,
      endedAt: deployment.ended_at,
      commit: deployment.commit?.hash,
      branch: deployment.commit?.branch,
      message: deployment.commit?.message,
    },
  };
}

import { Site } from "../api/Site";
import { findSite, tail } from "./helpers";

type Input = {
  /**
   * The site's id as a string, for example "2882133", or its exact name.
   */
  site: string;
  /**
   * Id of one deployment. Leave empty for the latest.
   */
  deploymentId?: number;
};

export default async function tool({ site, deploymentId }: Input) {
  const { site: found, server, token } = await findSite(site);
  const target = { orgSlug: server.org_slug, serverId: server.id, siteId: found.id, token };

  let deployment = deploymentId;
  if (!deployment) {
    const [latest] = await Site.getDeploymentHistory(target);
    if (!latest) return { site: found.name, log: "", note: "This site has no deployments yet." };
    deployment = latest.id;
  }

  const log = await Site.getDeploymentOutput({ ...target, deploymentId: deployment });
  return { site: found.name, deploymentId: deployment, log: tail(log) };
}

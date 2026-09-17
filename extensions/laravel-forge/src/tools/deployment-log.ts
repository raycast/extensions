import { Site } from "../api/Site";
import { dropOnMiss, locateSite } from "../lib/coordinates";
import { tail } from "./helpers";

type Input = {
  /**
   * A site id from list-sites, for example 2882133.
   */
  siteId: number;
  /**
   * Id of one deployment. Leave empty for the latest.
   */
  deploymentId?: number;
};

export default async function tool({ siteId, deploymentId }: Input) {
  const at = await locateSite(siteId);
  const target = { orgSlug: at.org, serverId: at.serverId, siteId, token: at.account.token };

  let deployment = deploymentId;
  if (!deployment) {
    const [latest] = await dropOnMiss("site", siteId, () => Site.getDeploymentHistory(target));
    if (!latest) return { siteId, log: "", note: "This site has no deployments yet." };
    deployment = latest.id;
  }

  const log = await dropOnMiss("site", siteId, () => Site.getDeploymentOutput({ ...target, deploymentId: deployment }));
  return { siteId, deploymentId: deployment, log: tail(log) };
}

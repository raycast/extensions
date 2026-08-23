import { Site } from "../api/Site";
import { findSite } from "./helpers";

type Input = {
  /**
   * The site's id as a string, for example "2882133", or its exact name.
   */
  site: string;
};

export default async function tool({ site }: Input) {
  const { site: found, server, token } = await findSite(site);
  const deployments = await Site.getDeploymentHistory({
    orgSlug: server.org_slug,
    serverId: server.id,
    siteId: found.id,
    token,
  });
  return deployments.map((deployment) => ({
    id: deployment.id,
    status: deployment.status,
    startedAt: deployment.started_at,
    endedAt: deployment.ended_at,
    commit: deployment.commit?.hash,
    branch: deployment.commit?.branch,
    message: deployment.commit?.message,
    author: deployment.commit?.author,
  }));
}

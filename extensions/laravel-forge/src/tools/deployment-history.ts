import { Site } from "../api/Site";
import { dropOnMiss, locateSite } from "../lib/coordinates";

type Input = {
  /**
   * A site id from list-sites, for example 2882133.
   */
  siteId: number;
};

export default async function tool({ siteId }: Input) {
  const at = await locateSite(siteId);
  const deployments = await dropOnMiss("site", siteId, () =>
    Site.getDeploymentHistory({ orgSlug: at.org, serverId: at.serverId, siteId, token: at.account.token }),
  );
  return {
    note: deployments.length
      ? "Pass an id to deployment-log to read one deploy's output."
      : "This site has no deployments yet.",
    deployments: deployments.map((deployment) => ({
      id: deployment.id,
      status: deployment.status,
      startedAt: deployment.started_at,
      endedAt: deployment.ended_at,
      commit: deployment.commit?.hash,
      branch: deployment.commit?.branch,
      message: deployment.commit?.message,
      author: deployment.commit?.author,
    })),
  };
}

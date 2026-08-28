import { allSites } from "./helpers";

type Input = {
  /**
   * Name of a server to limit the list to. Leave empty to list sites across every server and account.
   */
  server?: string;
};

export default async function tool({ server }: Input) {
  const sites = await allSites();
  const wanted = server?.trim().toLowerCase();
  return sites
    .filter((match) => !wanted || (match.server.name ?? "").toLowerCase().includes(wanted))
    .map(({ site, server: owner }) => ({
      id: site.id,
      name: site.name,
      server: owner.name,
      url: site.url,
      phpVersion: site.php_version,
      status: site.status,
      deploymentStatus: site.deployment_status,
      repository: site.repository?.url,
      branch: site.repository?.branch,
      quickDeploy: site.quick_deploy,
    }));
}

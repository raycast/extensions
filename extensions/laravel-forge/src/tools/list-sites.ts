import { allSites, searchSites, siteDeploymentStatus } from "./helpers";

type Input = {
  /**
   * Part of a site name to search for. Forge matches on contains, so "6-8" finds 6-8.example.com.
   */
  site?: string;
  /**
   * A server id, or part of a server name, to filter by. Leave empty for every site.
   */
  server?: string;
};

export default async function tool({ site, server }: Input) {
  let sites = site ? await searchSites(site) : await allSites();
  let note;
  if (site && !sites.length) {
    // Forge's filter only sees site names; the match may be in an alias or the server's name
    const all = await allSites();
    const query = site.trim().toLowerCase();
    sites = all.filter(({ site: found, server: owner }) =>
      [found.name, ...(found.aliases ?? []), owner.name]
        .filter(Boolean)
        .some((name) => String(name).toLowerCase().includes(query)),
    );
    if (!sites.length) {
      sites = all;
      note = `Nothing matches "${site}" by site name, alias or server name. Every site follows instead.`;
    }
  }
  const wanted = server?.trim().toLowerCase();
  const listed = sites
    .filter(
      (match) =>
        !wanted || (match.server.name ?? "").toLowerCase().includes(wanted) || String(match.server.id) === wanted,
    )
    .map(({ site, server: owner }) => ({
      id: site.id,
      name: site.name,
      server: owner.name,
      url: site.url,
      phpVersion: site.php_version,
      status: site.status,
      deploymentStatus: siteDeploymentStatus(site),
      repository: site.repository?.url,
      branch: site.repository?.branch,
      quickDeploy: site.quick_deploy,
    }));
  return note ? { note, sites: listed } : listed;
}

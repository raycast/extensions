import { allSites } from "./helpers";

export default async function tool() {
  const sites = await allSites();
  return {
    deploying: sites
      .filter(({ site }) => site.deployment_status === "deploying")
      .map(({ site, server }) => ({ site: site.name, server: server.name })),
    failed: sites
      .filter(({ site }) => site.deployment_status === "failed")
      .map(({ site, server }) => ({ site: site.name, server: server.name })),
  };
}

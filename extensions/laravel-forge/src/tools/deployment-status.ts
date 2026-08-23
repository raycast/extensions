import { allSites, siteDeploymentStatus } from "./helpers";

// A deploy waits at pending before queued, and a broken build lands on failed-build
const IN_FLIGHT = ["pending", "queued", "deploying"];
const FAILED = ["failed", "failed-build"];

export default async function tool() {
  const sites = await allSites();
  const listed = (wanted: string[]) =>
    sites
      .filter((match) => wanted.includes(siteDeploymentStatus(match.site) ?? ""))
      .map((match) => ({
        site: match.site.name,
        server: match.server.name,
        status: siteDeploymentStatus(match.site),
      }));

  return { deploying: listed(IN_FLIGHT), failed: listed(FAILED) };
}

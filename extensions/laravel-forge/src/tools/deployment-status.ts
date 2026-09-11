import { deploymentStatus } from "../api/Site";
import { flatten, relatedId } from "../lib/forge";
import { rememberSites } from "../lib/index-cache";
import { queryString, walkOrgs } from "../lib/listing";
import { ISite } from "../types";

// A deploy waits at pending before queued, and a broken build lands on failed-build
const IN_FLIGHT = ["pending", "queued", "deploying"];
const FAILED = ["failed", "failed-build"];

export default async function tool() {
  // This answers "nothing is deploying", so it has to read past the first page
  const { rows } = await walkOrgs(
    (ref) => `orgs/${ref.org}/sites`,
    queryString({}, ["include=server"], 30),
    undefined,
    undefined,
    { pages: 20 },
  );

  const sites = rows.map(({ ref, item }) => ({
    ref,
    site: flatten<ISite>(item),
    serverId: relatedId(item, "server"),
  }));

  await rememberSites(
    sites
      .filter(({ serverId }) => serverId)
      .map(({ ref, site, serverId }) => [site.id, { tokenKey: ref.account.tokenKey, org: ref.org, serverId }]),
  );

  const listed = (wanted: string[]) =>
    sites
      .filter(({ site }) => wanted.includes(deploymentStatus(site.deployment_status) ?? ""))
      .map(({ site, serverId }) => ({
        siteId: site.id,
        site: site.name,
        serverId,
        status: deploymentStatus(site.deployment_status),
      }));

  const deploying = listed(IN_FLIGHT);
  const failed = listed(FAILED);
  const note = deploying.length
    ? "Pass a siteId to deployment-log to watch one."
    : "Nothing is deploying right now. Forge only marks a site while a deploy runs.";

  return { note, deploying, failed };
}

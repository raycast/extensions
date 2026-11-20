import { Site } from "./types";

const DASHBOARD_URL = "https://dashboard.pantheon.io";

// The dashboard's workspace is the org you access the site *through*, not the org that
// owns it. site:list's `memberships` ("<uuid>:<name>,...") only lists workspaces you can
// access: org memberships, plus a "Team" entry whose UUID is your personal workspace.
// Sites in several of your orgs open from any of them, so the first org wins.
function workspaceId(site: Site): string | undefined {
  const memberships = (site.memberships ?? "")
    .split(",")
    .map((m) => m.split(":").map((part) => part.trim()))
    .filter(([id]) => id);
  const org = memberships.find(([, name]) => name?.toLowerCase() !== "team");
  return (org ?? memberships[0])?.[0];
}

export function dashboardUrl(site: Site): string {
  const workspace = workspaceId(site);
  if (!workspace) return `${DASHBOARD_URL}/sites/${site.id}`;
  const siteType = site.framework === "nodejs" ? "node-site" : "cms-site";
  return `${DASHBOARD_URL}/workspace/${workspace}/${siteType}/${site.id}`;
}

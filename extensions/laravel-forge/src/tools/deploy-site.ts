import { Tool } from "@raycast/api";
import { Site } from "../api/Site";
import { siteRecord } from "../lib/records";
import { repositoryLabel } from "../lib/url";

type Input = {
  /**
   * A site id from list-sites, for example 2882133.
   */
  siteId: number;
};

export const confirmation: Tool.Confirmation<Input> = async ({ siteId }) => {
  const { site, serverId } = await siteRecord(siteId);
  return {
    message: `Deploy ${site.name}?`,
    info: [
      { name: "Server", value: String(serverId) },
      { name: "Repository", value: repositoryLabel(site.repository) || "none" },
      { name: "Branch", value: site.repository?.branch ?? "unknown" },
      { name: "Current status", value: site.deployment_status ?? "idle" },
      { name: "Quick deploy", value: site.quick_deploy ? "on" : "off" },
    ],
  };
};

export default async function tool({ siteId }: Input) {
  const { site, org, serverId, account } = await siteRecord(siteId);
  await Site.deploy({ orgSlug: org, serverId, siteId, token: account.token });
  return { site: site.name, siteId, started: true, note: "Call deployment-status or deployment-log to follow it." };
}

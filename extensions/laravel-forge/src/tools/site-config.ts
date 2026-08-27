import { Site } from "../api/Site";
import { findSite, tail } from "./helpers";

type Input = {
  /**
   * Name of the site, as shown in Forge (for example "example.com").
   */
  site: string;
  // env is left out: it holds secrets the model would receive
  /**
   * Which file to read.
   */
  type: "nginx" | "application-log" | "nginx-error-log" | "nginx-access-log";
};

export default async function tool({ site, type }: Input) {
  const { site: found, server, token } = await findSite(site);
  const content = await Site.getConfig({
    orgSlug: server.org_slug,
    serverId: server.id,
    siteId: found.id,
    token,
    type,
  });
  return { site: found.name, type, content: tail(content) };
}

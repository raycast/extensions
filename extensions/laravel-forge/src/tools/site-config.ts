import { Site } from "../api/Site";
import { ConfigFile } from "../types";
import { findSite, tail } from "./helpers";

// env is left out: it holds secrets the model would receive
const READABLE: ConfigFile[] = ["nginx", "application-log", "nginx-error-log", "nginx-access-log"];

type Input = {
  /**
   * The site's id as a string, for example "2882133", or its exact name.
   */
  site: string;
  /**
   * Which file to read.
   */
  type: "nginx" | "application-log" | "nginx-error-log" | "nginx-access-log";
};

export default async function tool({ site, type }: Input) {
  if (!READABLE.includes(type)) {
    throw new Error(
      `This tool reads ${READABLE.join(", ")}. The environment file holds secrets and is not one of them.`,
    );
  }
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

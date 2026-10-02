import { Site } from "../api/Site";
import { dropOnMiss, locateSite } from "../lib/coordinates";
import { ConfigFile } from "../types";
import { tail } from "./helpers";

// env is left out: it holds secrets the model would receive
const READABLE: ConfigFile[] = ["nginx", "application-log", "nginx-error-log", "nginx-access-log"];

type Input = {
  /**
   * A site id from list-sites, for example 2882133.
   */
  siteId: number;
  /**
   * Which file to read.
   */
  type: "nginx" | "application-log" | "nginx-error-log" | "nginx-access-log";
};

export default async function tool({ siteId, type }: Input) {
  if (!READABLE.includes(type)) {
    throw new Error(
      `This tool reads ${READABLE.join(", ")}. The env file and deploy script are not readable here. get-site answers with a Forge link.`,
    );
  }
  const at = await locateSite(siteId);
  const content = await dropOnMiss("site", siteId, () =>
    Site.getConfig({ orgSlug: at.org, serverId: at.serverId, siteId, token: at.account.token, type }),
  );
  return { siteId, type, content: tail(content) };
}

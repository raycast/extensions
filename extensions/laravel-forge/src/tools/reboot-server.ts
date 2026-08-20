import { Tool } from "@raycast/api";
import { Server } from "../api/Server";
import { nameList, sitesOnServer, targetServer } from "./helpers";

type Input = {
  /**
   * Name of the server to reboot, as shown in Forge. Leave empty if you only know a site that runs on it.
   */
  server?: string;
  /**
   * Name of a site on the server, used when the server itself was not named.
   */
  site?: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ server, site }) => {
  const { server: found } = await targetServer({ server, site });
  const sites = await sitesOnServer(found);
  return {
    message: `Reboot ${found.name}? Every site on it goes down until it comes back.`,
    info: [
      { name: `Sites going down (${sites.length})`, value: nameList(sites) },
      { name: "Provider", value: [found.provider, found.region].filter(Boolean).join(" · ") || "unknown" },
      { name: "IP address", value: found.ip_address ?? "unknown" },
    ],
  };
};

export default async function tool({ server, site }: Input) {
  const { server: found, token } = await targetServer({ server, site });
  await Server.runAction({ server: found, token, action: "reboot" });
  return { server: found.name, action: "reboot", started: true };
}

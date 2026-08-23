import { Tool } from "@raycast/api";
import { Server } from "../api/Server";
import { nameList, resolveForConfirmation, sitesOnServer, targetServer } from "./helpers";

type Input = {
  /**
   * The server's id as a string, or its exact name. Leave empty if you only know a site on it.
   */
  server?: string;
  /**
   * The site's id as a string, for example "2882133", or its exact name.
   */
  site?: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ server, site }) => {
  const resolved = await resolveForConfirmation(() => targetServer({ server, site }));
  if (!resolved) return { message: `Reboot "${server ?? site}"?` };
  const { server: found } = resolved;
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

import { Tool } from "@raycast/api";
import { Server } from "../api/Server";
import { findServer, nameList, sitesOnServer } from "./helpers";

type Input = {
  /**
   * Name of the server to reboot, as shown in Forge.
   */
  server: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ server }) => {
  const { server: found } = await findServer(server);
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

export default async function tool({ server }: Input) {
  const { server: found, token } = await findServer(server);
  await Server.runAction({ server: found, token, action: "reboot" });
  return { server: found.name, action: "reboot", started: true };
}

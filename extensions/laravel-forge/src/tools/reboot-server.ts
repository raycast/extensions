import { Tool } from "@raycast/api";
import { Server } from "../api/Server";
import { serverRecord } from "../lib/records";
import { siteNames, sitesOn } from "./sites-on-server";
import { nameList } from "./helpers";

type Input = {
  /**
   * A server id from list-servers, for example 678350.
   */
  serverId: number;
};

export const confirmation: Tool.Confirmation<Input> = async ({ serverId }) => {
  const at = await serverRecord(serverId);
  const sites = await sitesOn({ ...at, serverId });
  return {
    message: `Reboot ${at.server.name}? Every site on it goes down until it comes back.`,
    info: [
      { name: `Sites going down (${sites.length})`, value: nameList(siteNames(sites)) },
      { name: "Provider", value: [at.server.provider, at.server.region].filter(Boolean).join(", ") || "unknown" },
      { name: "IP address", value: at.server.ip_address ?? "unknown" },
    ],
  };
};

export default async function tool({ serverId }: Input) {
  const { server, account } = await serverRecord(serverId);
  await Server.runAction({ server, token: account.token, action: "reboot" });
  return { server: server.name, serverId, action: "reboot", started: true };
}

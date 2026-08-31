import { Tool } from "@raycast/api";
import { SERVICE_ACTIONS, Server, Service, ServiceAction } from "../api/Server";
import { serverRecord } from "../lib/records";
import { nameList } from "./helpers";
import { siteNames, sitesOn } from "./sites-on-server";

type Input = {
  /**
   * A server id from list-servers, for example 678350.
   */
  serverId: number;
  /**
   * Which service to act on. database acts on whichever engine the server runs;
   * get-server shows it under databaseType.
   */
  service: Service;
  /**
   * What to do with the service. Defaults to a restart. Forge has no start at all: only
   * php takes reload, and only nginx and database take stop.
   */
  action?: ServiceAction;
};

// Forge answers 422 with no detail on an action a service does not take
const allowedFor = (service: Service, action: ServiceAction) => {
  const allowed = SERVICE_ACTIONS[service];
  if (!allowed) {
    throw new Error(`This tool acts on ${Object.keys(SERVICE_ACTIONS).join(", ")}, not "${service}".`);
  }
  if (!allowed.includes(action)) {
    throw new Error(`Forge only takes ${allowed.join(" or ")} on ${service}, not ${action}.`);
  }
  return action;
};

export const confirmation: Tool.Confirmation<Input> = async ({ serverId, service, action = "reboot" }) => {
  const at = await serverRecord(serverId);
  const sites = await sitesOn({ ...at, serverId });
  return {
    message: `${action === "reboot" ? "Restart" : action} ${service} on ${at.server.name}?`,
    info: [
      { name: `Sites affected (${sites.length})`, value: nameList(siteNames(sites)) },
      { name: "Server", value: at.server.name ?? String(serverId) },
      ...(service === "php" ? [{ name: "PHP version", value: at.server.php_version ?? "unknown" }] : []),
      ...(service === "database" ? [{ name: "Database", value: at.server.database_type || "none installed" }] : []),
    ],
  };
};

export default async function tool({ serverId, service, action = "reboot" }: Input) {
  const { server, account } = await serverRecord(serverId);
  await Server.runAction({ server, token: account.token, action: allowedFor(service, action), service });
  return { server: server.name, serverId, service, action, started: true };
}

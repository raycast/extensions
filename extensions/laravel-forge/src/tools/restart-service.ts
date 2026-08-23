import { Tool } from "@raycast/api";
import { SERVICE_ACTIONS, Server, Service, ServiceAction } from "../api/Server";
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
  /**
   * Which service to act on. database acts on whichever engine the server runs;
   * list-servers shows it under databaseType.
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

export const confirmation: Tool.Confirmation<Input> = async ({ server, site, service, action = "reboot" }) => {
  const resolved = await resolveForConfirmation(() => targetServer({ server, site }));
  if (!resolved) return { message: `Restart "${server ?? site}"?` };
  const { server: found } = resolved;
  const sites = await sitesOnServer(found);
  return {
    message: `${action === "reboot" ? "Restart" : action} ${service} on ${found.name}?`,
    info: [
      { name: `Sites affected (${sites.length})`, value: nameList(sites) },
      { name: "Server", value: found.name ?? String(found.id) },
      ...(service === "php" ? [{ name: "PHP version", value: found.php_version ?? "unknown" }] : []),
      ...(service === "database" ? [{ name: "Database", value: found.database_type || "none installed" }] : []),
    ],
  };
};

export default async function tool({ server, site, service, action = "reboot" }: Input) {
  const { server: found, token } = await targetServer({ server, site });
  await Server.runAction({ server: found, token, action: allowedFor(service, action), service });
  return { server: found.name, service, action, started: true };
}

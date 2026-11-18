import { forgeSiteUrl } from "../lib/url";
import { IServer, ISite } from "../types";
import forgeFields from "./forge-fields.json";

export type Target = "site" | "server";

type Catalog = { fields: Record<string, string>; inForgeOnly: string[]; onRequest: string[] };

// probe-api reports Forge's own snake_case, so a name is matched however it is spelled
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export const namesAsked = (input?: string) =>
  (input ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

// Forge's own name for a field a row labels differently
const ALIASES: Record<string, string> = { identifier: "providerId" };

const resolve = (byKey: Map<string, string>, name: string) =>
  byKey.get(key(name)) ?? byKey.get(key(ALIASES[key(name)] ?? ""));

export const pick = (available: Record<string, unknown>, asked: string[]) => {
  const byKey = new Map(Object.keys(available).map((name) => [key(name), name]));
  const picked: Record<string, unknown> = {};
  const unknown: string[] = [];
  for (const name of asked) {
    const match = resolve(byKey, name);
    if (match) picked[match] = available[match];
    else unknown.push(name);
  }
  return { picked, unknown };
};

export const siteRowExtras = (site: ISite) => ({
  aliases: site.aliases,
  phpVersion: site.php_version,
  appType: site.app_type,
  user: site.user,
  isolated: site.isolated,
  https: site.https,
  wildcards: site.wildcards,
  webDirectory: site.web_directory,
  rootDirectory: site.root_directory,
  sharedPaths: site.shared_paths,
  database: site.database,
  repository: site.repository,
  quickDeploy: site.quick_deploy,
  zeroDowntimeDeployments: site.zero_downtime_deployments,
  deploymentRetention: site.deployment_retention,
  usesEnvoyer: site.uses_envoyer,
  maintenanceMode: site.maintenance_mode,
  healthcheckUrl: site.healthcheck_url,
  createdAt: site.created_at,
  updatedAt: site.updated_at,
});

export const serverRowExtras = (server: IServer) => ({
  slug: server.slug,
  type: server.type,
  provider: server.provider,
  providerId: server.identifier,
  region: server.region,
  size: server.size,
  ipAddress: server.ip_address,
  privateIpAddress: server.private_ip_address,
  sshPort: server.ssh_port,
  timezone: server.timezone,
  ubuntuVersion: server.ubuntu_version,
  phpVersion: server.php_version,
  phpCliVersion: server.php_cli_version,
  databaseType: server.database_type,
  dbStatus: server.db_status,
  redisStatus: server.redis_status,
  opcacheStatus: server.opcache_status,
  revoked: server.revoked,
  createdAt: server.created_at,
  updatedAt: server.updated_at,
});

// An empty page has no row to read the key names off
const ROW_KEYS: Record<Target, string[]> = {
  site: Object.keys(siteRowExtras({} as ISite)),
  server: Object.keys(serverRowExtras({} as IServer)),
};

// The columns the list tools already return; a name here is redundant, not unknown
const ALWAYS: Record<Target, string[]> = {
  site: ["id", "name", "server_id", "status", "deployment_status"],
  server: ["id", "name", "connection_status"],
};

const GET_TOOL: Record<Target, string> = { site: "get-site", server: "get-server" };

const and = (names: string[]) => names.join(", ");

// A blanket "no such field" would send the model back to probe-api for a name it has
export const askedFor = (target: Target, input?: string, { ensure = [] as string[] } = {}) => {
  const asked = namesAsked(input);
  const { fields, inForgeOnly, onRequest } = forgeFields[target] as Catalog;
  const rows = new Map(ROW_KEYS[target].map((name) => [key(name), name]));
  const always = new Set(ALWAYS[target].map(key));
  const held = new Set(Object.keys(fields).map(key));
  const linkOnly = new Set(inForgeOnly.map(key));
  const includeOnly = new Set(onRequest.map(key));

  const names: string[] = [];
  const redundant: string[] = [];
  const linked: string[] = [];
  const gated: string[] = [];
  const unwired: string[] = [];
  const unknown: string[] = [];

  for (const name of asked) {
    const match = resolve(rows, name);
    if (match) names.push(match);
    else if (always.has(key(name))) redundant.push(name);
    else if (includeOnly.has(key(name))) gated.push(name);
    else if (linkOnly.has(key(name))) linked.push(name);
    else if (held.has(key(name))) unwired.push(name);
    else unknown.push(name);
  }

  for (const name of ensure) {
    const match = resolve(rows, name);
    if (match && !names.includes(match)) names.push(match);
  }

  const notes: string[] = [];
  if (redundant.length) notes.push(`Every row carries ${and(redundant)} already.`);
  if (gated.length) notes.push(`${and(gated)} is withheld unless asked for. Name it in ${GET_TOOL[target]}'s include.`);
  if (linked.length)
    notes.push(`${and(linked)} is never returned by this extension. ${GET_TOOL[target]} answers with a Forge link.`);
  if (unwired.length)
    notes.push(`Forge has ${and(unwired)} but this tool does not return it. Ask ${GET_TOOL[target]}.`);
  if (unknown.length)
    notes.push(`There is no ${target} field called ${and(unknown)}. Call probe-api for the real names.`);

  return {
    notes,
    requested: asked.length > 0,
    // undefined would be dropped by JSON.stringify and read as a field Forge lacks
    from: (extras: Record<string, unknown>) => Object.fromEntries(names.map((name) => [name, extras[name] ?? null])),
  };
};

export const serverIncludable = (server: IServer) => ({
  credentialId: server.credential_id,
  localPublicKey: server.local_public_key,
});

const notice = (available: Record<string, unknown>, picked: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(available)
      .filter((name) => !(name in picked))
      .map((name) => [name, `Withheld unless asked for. Name ${name} in include.`]),
  );

export const included = (available: Record<string, unknown>, include?: string) => {
  const { picked, unknown } = pick(available, namesAsked(include));
  const named = Object.fromEntries(Object.entries(picked).map(([name, value]) => [name, value ?? null]));
  return { ...notice(available, picked), ...named, ...(unknown.length ? { unknownInclude: unknown } : {}) };
};

// The env file and deploy script hold secrets, and deployment_url deploys with no auth
export const siteLinks = (server: IServer, siteId: number) => {
  const forgeUrl = forgeSiteUrl(server, siteId);
  const at = (path: string, verb: string, label: string) =>
    forgeUrl
      ? `Not returned by this extension. The user can ${verb} it at [${label}](${forgeUrl}${path}).`
      : `Not returned by this extension. The user can ${verb} it in Forge.`;
  return {
    environment: at("/environment", "read or edit", "Environment"),
    deploymentScript: at("/settings/deployments", "read or edit", "Deployment settings"),
    deploymentUrl: at("/settings/deployments", "find or change", "Deployment settings"),
  };
};

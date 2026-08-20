import { Server } from "../api/Server";
import { Site } from "../api/Site";
import { IServer, ISite } from "../types";
import { unwrapToken } from "../lib/auth";

export type ServerMatch = { server: IServer; token: string };
export type SiteMatch = { site: ISite; server: IServer; token: string };

const normalize = (value: string) => value.trim().toLowerCase();

// Errors instead of a best guess, so the model re-asks rather than hitting the wrong server
const noMatch = (kind: string, query: string, names: string[]) =>
  new Error(`No ${kind} matches "${query}". Available ${kind}s: ${names.join(", ")}`);

const ambiguous = (kind: string, query: string, names: string[]) =>
  new Error(`"${query}" matches several ${kind}s: ${names.join(", ")}. Ask which one.`);

export const allServers = async (): Promise<ServerMatch[]> => {
  const servers = await Server.getAll();
  return servers.map((server) => ({ server, token: unwrapToken(server.api_token_key) }));
};

export const findServer = async (query: string) => {
  const servers = await allServers();
  const search = normalize(query);
  const label = ({ server }: ServerMatch) => server.name ?? String(server.id);

  const exact = servers.filter(({ server }) => normalize(server.name ?? "") === search || String(server.id) === search);
  const found = exact.length ? exact : servers.filter(({ server }) => normalize(server.name ?? "").includes(search));

  if (!found.length) throw noMatch("server", query, servers.map(label));
  if (found.length > 1) throw ambiguous("server", query, found.map(label));
  return found[0];
};

export const allSites = async (): Promise<SiteMatch[]> => {
  const servers = await allServers();
  const tokenKeys = [...new Set(servers.map(({ server }) => server.api_token_key))];
  const perAccount = await Promise.all(
    tokenKeys.map(async (tokenKey) => {
      const token = unwrapToken(tokenKey);
      const sites = await Site.getSitesWithoutServer({ token });
      return sites.flatMap((site) => {
        // Server ids only mean anything within the account they came from
        const owner = servers.find(({ server }) => server.api_token_key === tokenKey && server.id === site.server_id);
        return owner ? [{ site, server: owner.server, token }] : [];
      });
    }),
  );
  return perAccount.flat();
};

export const findSite = async (query: string) => {
  const sites = await allSites();
  const search = normalize(query);
  const label = ({ site }: SiteMatch) => site.name ?? String(site.id);
  const names = ({ site }: SiteMatch) => [site.name ?? "", ...(site.aliases ?? [])].map(normalize);

  const exact = sites.filter((match) => names(match).includes(search) || String(match.site.id) === search);
  const found = exact.length ? exact : sites.filter((match) => names(match).some((name) => name.includes(search)));

  if (!found.length) throw noMatch("site", query, sites.map(label));
  if (found.length > 1) throw ambiguous("site", query, found.map(label));
  return found[0];
};

export const sitesOnServer = async (server: IServer) => {
  const sites = await allSites();
  return sites
    .filter((match) => match.server.id === server.id && match.server.api_token_key === server.api_token_key)
    .map(({ site }) => site.name ?? String(site.id));
};

export const nameList = (names: string[], limit = 8) => {
  if (!names.length) return "none";
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} and ${names.length - limit} more`;
};

// Logs run to megabytes and the whole result is fed to the model
export const tail = (output: string, limit = 4_000) =>
  output.length > limit ? `…truncated…\n${output.slice(-limit)}` : output;

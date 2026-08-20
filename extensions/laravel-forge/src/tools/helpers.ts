import { getPreferenceValues } from "@raycast/api";
import { sortBy } from "lodash";
import { unwrapToken } from "../lib/auth";
import { flatten, getCollection, relatedId, relatedResource } from "../lib/forge";
import { IServer, ISite } from "../types";

export type ServerMatch = { server: IServer; token: string };
export type SiteMatch = { site: ISite; server: IServer; token: string };

type Account = { tokenKey: string; token: string; sshUser: string };

// One fetch serves a whole answer: a confirmation and its tool, or two tools the model chains
const once = <T>(build: () => Promise<T>) => {
  let pending: Promise<T> | undefined;
  return () => (pending ??= build());
};

const accounts = (): Account[] => {
  const preferences = getPreferenceValues();
  return [
    { tokenKey: "laravel_forge_api_token", sshUser: String(preferences?.laravel_forge_ssh_user || "forge") },
    { tokenKey: "laravel_forge_api_token_two", sshUser: String(preferences?.laravel_forge_ssh_user_two || "forge") },
  ]
    .map((account) => ({ ...account, token: unwrapToken(account.tokenKey) }))
    .filter((account) => account.token);
};

const orgSlugs = once(async () => {
  const entries = await Promise.all(
    accounts().map(async ({ tokenKey, token }) => {
      const { items } = await getCollection("orgs", token);
      return [tokenKey, items.map((org) => String(org.attributes?.slug ?? ""))] as const;
    }),
  );
  return new Map(entries);
});

export const allServers = once(async (): Promise<ServerMatch[]> => {
  const slugs = await orgSlugs();
  const perAccount = await Promise.all(
    accounts().map(async ({ tokenKey, token, sshUser }) => {
      const perOrg = await Promise.all(
        (slugs.get(tokenKey) ?? []).map(async (slug) => {
          const { items } = await getCollection(`orgs/${slug}/servers`, token);
          return items.map((server) => ({
            server: { ...flatten<IServer>(server), org_slug: slug, api_token_key: tokenKey, ssh_user: sshUser },
            token,
          }));
        }),
      );
      return perOrg.flat();
    }),
  );
  return sortBy(
    perAccount.flat().filter(({ server }) => !server.revoked),
    ({ server }) => server.name?.toLowerCase(),
  );
});

const orgByServerId = async (tokenKey: string) => {
  const servers = await allServers();
  return new Map(
    servers.filter(({ server }) => server.api_token_key === tokenKey).map(({ server }) => [server.id, server.org_slug]),
  );
};

export const allSites = once(async (): Promise<SiteMatch[]> => {
  const slugs = await orgSlugs();
  const perAccount = await Promise.all(
    accounts().map(async ({ tokenKey, token, sshUser }) => {
      const { items, included } = await getCollection("sites?include=server", token);
      const orgs = slugs.get(tokenKey) ?? [];
      // The site list carries its server; only the org slug needs the server walk
      const owners = orgs.length > 1 ? await orgByServerId(tokenKey) : undefined;

      return items.flatMap((item) => {
        const resource = relatedResource(item, "server", included);
        if (!resource) return [];
        const id = Number(resource.id);
        const server: IServer = {
          ...flatten<IServer>(resource),
          org_slug: owners ? (owners.get(id) ?? "") : (orgs[0] ?? ""),
          api_token_key: tokenKey,
          ssh_user: sshUser,
        };
        const site = { ...flatten<ISite>(item), server_id: relatedId(item, "server") ?? id };
        return [{ site, server, token }];
      });
    }),
  );
  return sortBy(perAccount.flat(), ({ site }) => site.name?.toLowerCase());
});

export const sitesOnServer = async (server: IServer) => {
  const sites = await allSites();
  return sites
    .filter((match) => match.server.id === server.id && match.server.api_token_key === server.api_token_key)
    .map(({ site }) => site.name ?? String(site.id));
};

const normalize = (value: string) => value.trim().toLowerCase();

// Errors instead of a best guess, so the model re-asks rather than hitting the wrong server
const noMatch = (kind: string, query: string, names: string[]) =>
  new Error(`No ${kind} matches "${query}". Available ${kind}s: ${names.join(", ")}`);

const ambiguous = (kind: string, query: string, names: string[]) =>
  new Error(`"${query}" matches several ${kind}s: ${names.join(", ")}. Ask which one.`);

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

export const targetServer = async ({ server, site }: { server?: string; site?: string }): Promise<ServerMatch> => {
  if (server) return findServer(server);
  if (site) {
    const match = await findSite(site);
    return { server: match.server, token: match.token };
  }
  throw new Error("Name the server, or a site that runs on it.");
};

export const nameList = (names: string[], limit = 8) => {
  if (!names.length) return "none";
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} and ${names.length - limit} more`;
};

// Logs run to megabytes and the whole result is fed to the model
export const tail = (output: string, limit = 4_000) =>
  output.length > limit ? `…truncated…\n${output.slice(-limit)}` : output;

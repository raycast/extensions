import { sortBy } from "lodash";
import { ConfigFile, IDeployment, IServer, ISite } from "../types";
import { flatten, getCollection, getResource, postAction, relatedId, relatedResource } from "../lib/forge";

type ServerWithToken = { orgSlug: IServer["org_slug"]; serverId: IServer["id"]; token: string };
type ServerSiteWithToken = ServerWithToken & { siteId: ISite["id"] };

const configResource: Record<ConfigFile, string> = {
  env: "environment",
  nginx: "nginx",
  "application-log": "logs/application",
  "nginx-error-log": "logs/nginx-error",
  "nginx-access-log": "logs/nginx-access",
};

export const Site = {
  async getSitesWithoutServer({ token }: { token: string }) {
    if (!token) return [];
    const { items } = await getCollection("sites?include=server", token);
    return sortAndFilterSites(
      items.map((site) => ({ ...flatten<ISite>(site), server_id: relatedId(site, "server") ?? 0 })),
    );
  },

  async getAll({ orgSlug, serverId, token }: ServerWithToken) {
    if (!token) return [];
    const endpoint = `orgs/${orgSlug}/servers/${serverId}/sites?include=latestDeployment`;
    const { items, included } = await getCollection(endpoint, token);
    return sortAndFilterSites(
      items.map((site) => {
        const deployment = relatedResource(site, "latestDeployment", included);
        return {
          ...flatten<ISite>(site),
          server_id: serverId,
          latest_deployment: deployment && flatten<IDeployment>(deployment),
        };
      }),
    );
  },

  async deploy({ orgSlug, serverId, siteId, token }: ServerSiteWithToken) {
    await postAction(`orgs/${orgSlug}/servers/${serverId}/sites/${siteId}/deployments`, token);
  },

  async getConfig({ orgSlug, serverId, siteId, token, type }: ServerSiteWithToken & { type: ConfigFile }) {
    const endpoint = `orgs/${orgSlug}/servers/${serverId}/sites/${siteId}/${configResource[type]}`;
    const config = await getResource(endpoint, token);
    return String(config?.attributes?.content ?? "").trim();
  },

  async getDeploymentHistory({ orgSlug, serverId, siteId, token }: ServerSiteWithToken) {
    // created_at is the only sort this endpoint allows
    const endpoint = `orgs/${orgSlug}/servers/${serverId}/sites/${siteId}/deployments?sort=-created_at`;
    const { items } = await getCollection(endpoint, token, { pages: 1 });
    return items.map((deployment) => flatten<IDeployment>(deployment));
  },

  async getDeploymentOutput({
    orgSlug,
    serverId,
    siteId,
    deploymentId,
    token,
  }: ServerSiteWithToken & { deploymentId: IDeployment["id"] }) {
    const endpoint = `orgs/${orgSlug}/servers/${serverId}/sites/${siteId}/deployments/${deploymentId}/log`;
    const log = await getResource(endpoint, token);
    return String(log?.attributes?.output ?? "");
  },
};

export const sortAndFilterSites = (sites: ISite[]) => sortBy(sites ?? [], "name") as ISite[];

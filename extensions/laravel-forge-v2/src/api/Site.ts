import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { ConfigFile, IDeployment, IServer, ISite } from "../types";
import { apiFetch, authHeaders, fetchAllPages } from "../lib/api";
import {
  ContentAttributes,
  DeploymentAttributes,
  DeploymentOutputAttributes,
  JsonApiSingle,
  SiteAttributes,
} from "../lib/jsonapi";
import { normalizeDeployment, normalizeSite } from "./normalize";
import { Org } from "./Org";

// `WithOrg` (not `Org`) avoids clashing with the imported `Org` API object.
type WithOrg = { org: string };
type ServerWithToken = WithOrg & { serverId: IServer["id"]; token: string };
type ServerSiteWithToken = ServerWithToken & { siteId: ISite["id"] };

const sortSites = (sites: ISite[]): ISite[] => sortBy(sites, "name");

export const Site = {
  // Aggregates every org's sites for the account behind `token`. Used by the
  // menu-bar deploy watcher.
  async getSitesWithoutServer({ token }: { token: string }): Promise<ISite[]> {
    if (!token) return [];
    const orgs = await Org.getAll({ token });
    const perOrg = await Promise.all(orgs.map((org) => Site.getSitesForOrg({ org: org.slug, token })));
    return sortSites(perOrg.flat());
  },

  // Sites for a single org (also used to build server keyword search data).
  async getSitesForOrg({ org, token }: WithOrg & { token: string }): Promise<ISite[]> {
    const resources = await fetchAllPages<SiteAttributes>(`${FORGE_API_URL}/orgs/${org}/sites`, {
      method: "get",
      headers: authHeaders(token),
    });
    return sortSites(resources.map((r) => normalizeSite(r, { org_slug: org })));
  },

  async getAll({ org, serverId, token }: ServerWithToken): Promise<ISite[]> {
    const resources = await fetchAllPages<SiteAttributes>(`${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites`, {
      method: "get",
      headers: authHeaders(token),
    });
    return sortSites(resources.map((r) => normalizeSite(r, { org_slug: org, server_id: serverId })));
  },

  async deploy({ org, serverId, siteId, token }: ServerSiteWithToken): Promise<void> {
    await apiFetch(`${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/deployments`, {
      method: "post",
      headers: authHeaders(token),
    });
  },

  async getConfig({ org, serverId, siteId, token, type }: ServerSiteWithToken & { type: ConfigFile }): Promise<string> {
    const path = type === "env" ? "environment" : "nginx";
    const response = await apiFetch<JsonApiSingle<ContentAttributes>>(
      `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/${path}`,
      { method: "get", headers: authHeaders(token) }
    );
    return (response?.data?.attributes?.content ?? "").trim();
  },

  async getDeploymentHistory({ org, serverId, siteId, token }: ServerSiteWithToken): Promise<IDeployment[]> {
    const resources = await fetchAllPages<DeploymentAttributes>(
      `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/deployments`,
      { method: "get", headers: authHeaders(token) }
    );
    return resources.map((r) => normalizeDeployment(r, { server_id: serverId, site_id: siteId }));
  },

  async getDeploymentOutput({
    org,
    serverId,
    siteId,
    deploymentId,
    token,
  }: ServerSiteWithToken & { deploymentId: IDeployment["id"] }): Promise<string> {
    const response = await apiFetch<JsonApiSingle<DeploymentOutputAttributes>>(
      `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/deployments/${deploymentId}/log`,
      { method: "get", headers: authHeaders(token) }
    );
    return response?.data?.attributes?.output ?? "";
  },
};

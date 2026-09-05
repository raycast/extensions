import { DeploymentAttributes, JsonApiResource, ServerAttributes, SiteAttributes } from "../lib/jsonapi";
import { IDeployment, IServer, ISite } from "../types";

// v2 returns ISO-8601 timestamps ("2025-07-29T09:00:00Z"). Several components build
// dates with `new Date(value + " UTC")`, which fails on ISO strings. Reformat to
// "YYYY-MM-DD HH:MM:SS" in UTC so appending " UTC" parses correctly.
export const toForgeTimestamp = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 19).replace("T", " ");
};

type ServerCtx = { org_slug: string; api_token_key: string; ssh_user: string };

export const normalizeServer = (resource: JsonApiResource<ServerAttributes>, ctx: ServerCtx): IServer => {
  const a = resource.attributes ?? ({} as ServerAttributes);
  return {
    id: resource.id,
    org_slug: ctx.org_slug,
    api_token_key: ctx.api_token_key,
    ssh_user: ctx.ssh_user,
    credential_id: a.credential_id != null ? String(a.credential_id) : null,
    name: a.name,
    type: a.type,
    provider: a.provider,
    provider_id: a.identifier ?? null,
    size: a.size,
    region: a.region,
    ubuntu_version: a.ubuntu_version,
    db_status: a.db_status,
    redis_status: a.redis_status,
    php_version: a.php_version,
    php_cli_version: a.php_cli_version,
    opcache_status: a.opcache_status,
    database_type: a.database_type,
    ip_address: a.ip_address,
    ssh_port: a.ssh_port,
    private_ip_address: a.private_ip_address,
    local_public_key: a.local_public_key,
    connection_status: a.connection_status,
    timezone: a.timezone,
    revoked: a.revoked,
    created_at: toForgeTimestamp(a.created_at),
    is_ready: a.is_ready,
    tags: [],
    keywords: [],
  };
};

type SiteCtx = { org_slug: string; server_id?: string };

// The org-level /orgs/{slug}/sites endpoint carries no server relationship or
// attribute — the server id only appears in the deployment_url path
// (…/servers/{id}/sites/…). Extract it so those sites can resolve their server.
const serverIdFromDeploymentUrl = (url?: string): string | undefined => url?.match(/\/servers\/(\d+)/)?.[1];

export const normalizeSite = (resource: JsonApiResource<SiteAttributes>, ctx: SiteCtx): ISite => {
  const a = resource.attributes ?? ({} as SiteAttributes);
  const serverId =
    resource.relationships?.server?.data?.id ?? ctx.server_id ?? serverIdFromDeploymentUrl(a.deployment_url) ?? "";
  return {
    id: resource.id,
    server_id: serverId,
    org_slug: ctx.org_slug,
    name: a.name,
    aliases: a.aliases ?? [],
    directory: a.web_directory,
    wildcards: a.wildcards ?? false,
    status: a.status,
    repository: a.repository?.url ?? undefined,
    repository_provider: a.repository?.provider,
    repository_branch: a.repository?.branch ?? undefined,
    repository_status: a.repository?.status ?? undefined,
    quick_deploy: a.quick_deploy ?? false,
    deployment_status: a.deployment_status ?? null,
    project_type: a.app_type ?? undefined,
    php_version: a.php_version,
    app: null,
    created_at: toForgeTimestamp(a.created_at),
    username: a.user,
    deployment_url: a.deployment_url,
    is_secured: a.https,
    tags: [],
  };
};

type DeploymentCtx = { server_id?: string; site_id?: string };

export const normalizeDeployment = (
  resource: JsonApiResource<DeploymentAttributes>,
  ctx: DeploymentCtx = {}
): IDeployment => {
  const a = resource.attributes ?? ({} as DeploymentAttributes);
  return {
    id: resource.id,
    server_id: ctx.server_id,
    site_id: ctx.site_id,
    type: a.type,
    displayable_type: a.type,
    commit_hash: a.commit?.hash ?? undefined,
    commit_author: a.commit?.author ?? undefined,
    commit_message: a.commit?.message ?? undefined,
    started_at: toForgeTimestamp(a.started_at),
    ended_at: toForgeTimestamp(a.ended_at),
    status: a.status,
  };
};

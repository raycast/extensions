import { ManagementClient, ManagementError } from "auth0";
import {
  Auth0App,
  Connection,
  LogEntry,
  Organization,
  ResourceServer,
  Role,
  Session,
  TenantConfig,
  User,
  UserGrant,
} from "./types";

/** Cache of ManagementClient instances keyed by domain (SDK handles token management). */
const clientCache: Map<string, ManagementClient> = new Map();

/**
 * Get or create a cached Auth0 ManagementClient for the given tenant config.
 * Reuses existing clients to avoid redundant token negotiations.
 */
function getClient(config: TenantConfig): ManagementClient {
  const cacheKey = `${config.domain}:${config.clientId}:${config.clientSecret}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = new ManagementClient({
    domain: config.domain,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  clientCache.set(cacheKey, client);
  return client;
}

/**
 * Extract a user-friendly error message from Auth0 SDK errors.
 * For 403 errors, includes the required scope so users know what to grant.
 */
export function getAuth0ErrorMessage(err: unknown, requiredScope?: string): string {
  if (err instanceof ManagementError) {
    if (err.statusCode === 403 && requiredScope) {
      return `Forbidden: grant the "${requiredScope}" scope to your Auth0 application in the API settings`;
    }
    const body = err.body as { message?: string } | undefined;
    return body?.message || err.message || `Auth0 API error (${err.statusCode})`;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

/**
 * Search Auth0 users by email or name using Lucene wildcard syntax.
 * Returns the 20 most recent users when no search term is provided.
 * Requires at least 3 characters for wildcard search (Auth0 v3 engine constraint).
 */
export async function searchUsers(config: TenantConfig, searchTerm: string): Promise<User[]> {
  const client = getClient(config);
  const trimmed = searchTerm.trim();

  if (!trimmed) {
    const response = await client.users.list({
      per_page: 20,
      sort: "created_at:-1",
    });
    return response.data as unknown as User[];
  }

  // Auth0 search engine v3 requires wildcard terms to be at least 3 characters
  if (trimmed.length < 3) {
    return [];
  }

  const query = `email:*${trimmed}* OR name:*${trimmed}*`;
  const response = await client.users.list({
    q: query,
    search_engine: "v3",
    per_page: 20,
  });
  return response.data as unknown as User[];
}

/** Fetch all organizations a specific user belongs to. */
export async function getUserOrganizations(config: TenantConfig, userId: string): Promise<Organization[]> {
  const client = getClient(config);
  const response = await client.users.organizations.list(userId);
  return response.data as unknown as Organization[];
}

/** Fetch all roles assigned to a specific user. */
export async function getUserRoles(config: TenantConfig, userId: string): Promise<Role[]> {
  const client = getClient(config);
  const response = await client.users.roles.list(userId, { per_page: 50, page: 0 });
  return response.data as unknown as Role[];
}

/** List organizations for the tenant using checkpoint pagination. */
export async function listOrganizations(config: TenantConfig, take = 50): Promise<Organization[]> {
  const client = getClient(config);
  const response = await client.organizations.list({ take });
  return response.data as unknown as Organization[];
}

/** Fetch up to 100 members of a specific organization. */
export async function getOrganizationMembers(config: TenantConfig, orgId: string): Promise<User[]> {
  const client = getClient(config);
  const response = await client.organizations.members.list(orgId, { take: 100 });
  return response.data as unknown as User[];
}

/** Create a new Auth0 organization. */
export async function createOrganization(
  config: TenantConfig,
  data: { name: string; display_name?: string },
): Promise<Organization> {
  const client = getClient(config);
  const response = await client.organizations.create({
    name: data.name,
    ...(data.display_name && { display_name: data.display_name }),
  });
  return response as unknown as Organization;
}

/** Add one or more users as members of an organization. */
export async function addMembersToOrganization(config: TenantConfig, orgId: string, userIds: string[]): Promise<void> {
  const client = getClient(config);
  await client.organizations.members.create(orgId, { members: userIds });
}

/**
 * Fetch tenant logs with optional text search and date range filtering.
 * Date ranges are passed as a Lucene `q` query via `requestOptions.queryParams`.
 */
export async function getLogs(
  config: TenantConfig,
  options?: { search?: string; page?: number; per_page?: number; dateFrom?: Date; dateTo?: Date },
): Promise<LogEntry[]> {
  const client = getClient(config);

  // Build Lucene date range for the q parameter
  const from = options?.dateFrom?.toISOString() ?? "*";
  const to = options?.dateTo?.toISOString() ?? "*";
  const dateQuery = from !== "*" || to !== "*" ? `date:[${from} TO ${to}]` : undefined;

  const response = await client.logs.list(
    {
      search: options?.search || undefined,
      page: options?.page ?? 0,
      per_page: options?.per_page ?? 50,
      sort: "date:-1",
    },
    dateQuery ? { queryParams: { q: dateQuery } } : undefined,
  );
  return response.data as unknown as LogEntry[];
}

/** Verify tenant credentials by fetching the tenant's friendly name. */
export async function testConnection(config: TenantConfig): Promise<{ friendly_name?: string }> {
  const client = getClient(config);
  const response = await client.tenants.settings.get({ fields: "friendly_name" });
  return response as { friendly_name?: string };
}

/** Fetch all users with `blocked: true` on the tenant. */
export async function getBlockedUsers(config: TenantConfig): Promise<User[]> {
  const client = getClient(config);
  const response = await client.users.list({
    q: "blocked:true",
    search_engine: "v3",
    per_page: 50,
    sort: "created_at:-1",
  });
  return response.data as unknown as User[];
}

/** Set a user's `blocked` flag to false, allowing them to log in again. */
export async function unblockUser(config: TenantConfig, userId: string): Promise<void> {
  const client = getClient(config);
  await client.users.update(userId, { blocked: false });
}

/** Fetch up to 50 active sessions for a user. */
export async function getUserSessions(config: TenantConfig, userId: string): Promise<Session[]> {
  const client = getClient(config);
  const response = await client.users.sessions.list(userId, { take: 50 });
  return response.data as unknown as Session[];
}

/** Fetch all OAuth2 grants issued to a user. */
export async function getUserGrants(config: TenantConfig, userId: string): Promise<UserGrant[]> {
  const client = getClient(config);
  const response = await client.userGrants.list({ user_id: userId });
  return response.data as unknown as UserGrant[];
}

/** Terminate all active sessions for a user, forcing re-authentication. */
export async function revokeUserSessions(config: TenantConfig, userId: string): Promise<void> {
  const client = getClient(config);
  await client.users.sessions.delete(userId);
}

/** Revoke a specific OAuth2 grant by its ID. */
export async function revokeGrant(config: TenantConfig, grantId: string): Promise<void> {
  const client = getClient(config);
  await client.userGrants.delete(grantId);
}

/** List Auth0 applications (clients) for the tenant. */
export async function listApps(config: TenantConfig, perPage = 50): Promise<Auth0App[]> {
  const client = getClient(config);
  const response = await client.clients.list({ per_page: perPage, page: 0 });
  return response.data as unknown as Auth0App[];
}

/** List Auth0 APIs (resource servers) for the tenant. */
export async function listResourceServers(config: TenantConfig, perPage = 50): Promise<ResourceServer[]> {
  const client = getClient(config);
  const response = await client.resourceServers.list({ per_page: perPage, page: 0 });
  return response.data as unknown as ResourceServer[];
}

/** Fetch a single Auth0 API (resource server) by ID. */
export async function getResourceServer(config: TenantConfig, id: string): Promise<ResourceServer> {
  const client = getClient(config);
  const response = await client.resourceServers.get(id);
  return response as unknown as ResourceServer;
}

/** List connections for the tenant using checkpoint pagination. */
export async function listConnections(config: TenantConfig): Promise<Connection[]> {
  const client = getClient(config);
  const response = await client.connections.list({ take: 100 });
  return response.data as unknown as Connection[];
}

/** Create a new Auth0 database connection. */
export async function createConnection(
  config: TenantConfig,
  data: {
    name: string;
    display_name?: string;
    identifier?: string;
    authMethod: string;
    customDatabase: boolean;
    enableSignup: boolean;
    domainConnection: boolean;
  },
): Promise<Connection> {
  const client = getClient(config);

  const authMethods: Record<string, unknown> = {};
  if (data.authMethod === "password" || data.authMethod === "both") {
    authMethods.password = { enabled: true };
  }
  if (data.authMethod === "passkey" || data.authMethod === "both") {
    authMethods.passkey = { enabled: true };
  }
  if (data.authMethod === "password") {
    authMethods.passkey = { enabled: false };
  }
  if (data.authMethod === "passkey") {
    authMethods.password = { enabled: false };
  }

  const response = await client.connections.create({
    name: data.name,
    strategy: "auth0",
    ...(data.display_name && { display_name: data.display_name }),
    ...(data.domainConnection && { is_domain_connection: true }),
    ...(data.identifier && { metadata: { identifier: data.identifier } }),
    options: {
      authentication_methods: authMethods,
      enabledDatabaseCustomization: data.customDatabase,
      disable_signup: !data.enableSignup,
    },
  });
  return response as unknown as Connection;
}

/** Create a new Auth0 user on the given connection. */
export async function createUser(
  config: TenantConfig,
  data: { email: string; password: string; connection: string; name?: string },
): Promise<User> {
  const client = getClient(config);
  const response = await client.users.create({
    email: data.email,
    password: data.password,
    connection: data.connection,
    ...(data.name && { name: data.name }),
  });
  return response as unknown as User;
}

/** Replace all scopes on an Auth0 API (resource server). */
export async function updateResourceServerScopes(
  config: TenantConfig,
  id: string,
  scopes: Array<{ value: string; description?: string }>,
): Promise<void> {
  const client = getClient(config);
  await client.resourceServers.update(id, { scopes });
}

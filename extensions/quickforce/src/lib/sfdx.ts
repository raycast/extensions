import { open, LocalStorage } from "@raycast/api";
import { AuthInfo, Connection, Org, StateAggregator } from "@salesforce/core";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

process.env["SF_DISABLE_LOG_FILE"] = "true";

const execFilePromise = promisify(execFile);

// `exec` runs through a shell, so PATH is inherited from the user's shell profile.
// `execFile` does not use a shell, so `sf` must be resolved to an absolute path -
// Raycast's own process PATH may not include the user's shell customizations.
const SF_CANDIDATE_PATHS = [
  "sf",
  "/usr/local/bin/sf",
  "/opt/homebrew/bin/sf",
  path.join(process.env.HOME ?? "", ".local/share/npm/bin/sf"),
];
let resolvedSfPath: string | undefined;

async function resolveSfPath(): Promise<string> {
  if (resolvedSfPath) return resolvedSfPath;

  for (const candidate of SF_CANDIDATE_PATHS) {
    try {
      await execFilePromise(candidate, ["--version"]);
      resolvedSfPath = candidate;
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        // Binary exists but errored (e.g. bad args) - still usable.
        resolvedSfPath = candidate;
        return candidate;
      }
    }
  }

  throw new Error("Could not find the `sf` CLI. Make sure the Salesforce CLI is installed.");
}

async function sfCli(args: string[], opts: { maxBuffer?: number } = {}): Promise<string> {
  const sfPath = await resolveSfPath();
  const { stdout } = await execFilePromise(sfPath, args, { maxBuffer: opts.maxBuffer ?? 1024 * 1024 * 10 });
  return stdout;
}

// Cache authenticated Connections per org so data-access calls hit the API
// directly instead of spawning the `sf` CLI (~1-2s per call). Raycast command
// processes are short-lived, so staleness is not a concern.
const connectionCache = new Map<string, Connection>();

async function getConnection(usernameOrAlias: string): Promise<Connection> {
  const cached = connectionCache.get(usernameOrAlias);
  if (cached) return cached;
  const org = await Org.create({ aliasOrUsername: usernameOrAlias });
  await org.refreshAuth();
  const conn = org.getConnection();
  connectionCache.set(usernameOrAlias, conn);
  return conn;
}

export interface OrgMetadata {
  label?: string;
  color?: string;
  section?: string;
  openTo?: "home" | "setup" | "developer-console" | "custom";
  customPath?: string;
}

export interface OrgDetails {
  username: string;
  id: string;
  instanceUrl: string;
  apiVersion: string;
  accessToken: string;
  connectedStatus: string;
  alias?: string;
}

export interface QueryResult {
  records: Record<string, unknown>[];
  totalSize: number;
  done: boolean;
}

export interface SalesforceOrg {
  alias: string;
  username: string;
  orgId: string;
  instanceUrl: string;
  isDefaultUsername: boolean;
}

export interface OrgLimit {
  name: string;
  max: number;
  remaining: number;
}

export interface OrgLimitsResponse {
  limits: Record<string, OrgLimit>;
}

export interface InstalledPackage {
  Id: string;
  SubscriberPackageId: string;
  SubscriberPackageName: string;
  SubscriberPackageNamespace: string;
  SubscriberPackageVersionId: string;
  SubscriberPackageVersionName: string;
  SubscriberPackageVersionNumber: string;
}

export interface EnhancedOrgDetails {
  // Existing fields from getOrgDetails()
  username: string;
  id: string;
  instanceUrl: string;
  apiVersion: string;
  accessToken: string;
  connectedStatus: string;
  alias?: string;

  // New fields
  orgType?: string; // "Production", "Sandbox", "Scratch"
  edition?: string; // "Developer Edition", "Enterprise Edition", etc.
  isSandbox?: boolean;
  namespace?: string;
}

export interface CurrentUserInfo {
  username: string;
  profileName: string;
  roleName?: string;
  userType: string;
  isActive: boolean;
}

export interface SalesforceUser {
  Id: string;
  Name: string;
  Username: string;
  Email: string;
  Phone?: string;
  Profile: {
    Name: string;
  };
  UserRole?: {
    Name: string;
  };
  IsActive: boolean;
  IsFrozen?: boolean;
  LastLoginDate?: string;
  UserType: string;
  CreatedDate: string;
}

export interface LoginHistoryEntry {
  Id: string;
  LoginTime: string;
  LoginType: string;
  Status: string;
  SourceIp?: string;
  Browser?: string;
  Platform?: string;
}

export interface UserDetailInfo extends SalesforceUser {
  loginHistory: LoginHistoryEntry[];
}

const RECENT_ORGS_KEY = "recent-orgs";
const MAX_RECENT_ORGS = 5;

// List Org: AuthInfo + single CLI call for default org
export async function listOrgs(): Promise<SalesforceOrg[]> {
  try {
    // Fast: Get all orgs from AuthInfo
    const authInfos = await AuthInfo.listAllAuthorizations();

    // Single CLI call to get default org (fast)
    let defaultUsername: string | undefined;
    try {
      const stdout = await sfCli(["config", "get", "target-org", "--json"]);
      const result = JSON.parse(stdout);
      defaultUsername = result.result?.[0]?.value;
    } catch {
      // No default org set
    }

    return authInfos.map((auth) => ({
      alias: auth.aliases && auth.aliases.length > 0 ? auth.aliases[0] : auth.username,
      username: auth.username,
      orgId: auth.orgId || "",
      instanceUrl: auth.instanceUrl || "",
      isDefaultUsername: auth.username === defaultUsername,
    }));
  } catch (error) {
    throw new Error(`Failed to list orgs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeSoqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeSoqlLike(value: string): string {
  return escapeSoqlString(value).replace(/([%_])/g, "\\$1");
}

function escapeSoslSearchTerm(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/([?&|!{}[\]()^~*:"'+-])/g, "\\$1");
}

function isSalesforceId(value: string): boolean {
  return /^[a-zA-Z0-9]{15,18}$/.test(value);
}

// Opens a Salesforce org in the browser by POSTing an access token to
// frontdoor.jsp from a locally-served HTML file. This bypasses the standard
// OAuth redirect flow and is ~5x faster than `sf org open`.
async function openViaFrontdoorBridge(instanceUrl: string, accessToken: string, retUrl?: string): Promise<void> {
  const htmlContent = `
    <html>
      <body onload="document.body.firstElementChild.submit()">
        <form method="POST" action="${escapeHtml(instanceUrl)}/secur/frontdoor.jsp">
          <input type="hidden" name="sid" value="${escapeHtml(accessToken)}" />
          <input type="hidden" name="directBridge2" value="true" />
          ${retUrl ? `<input type="hidden" name="retURL" value="${escapeHtml(retUrl)}" />` : ""}
        </form>
      </body>
    </html>`;

  const tempFilePath = path.join(tmpdir(), `org-open-${crypto.randomUUID()}.html`);

  try {
    await fs.promises.writeFile(tempFilePath, htmlContent, { mode: 0o600 });
    await open(pathToFileURL(tempFilePath).href);
  } catch (error) {
    try {
      fs.rmSync(tempFilePath, { force: true });
    } catch {
      /* ignore cleanup errors */
    }
    throw error;
  }

  setTimeout(() => {
    try {
      fs.rmSync(tempFilePath, { force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }, 5000);
}

// Open org
export async function openOrg(usernameOrAlias: string): Promise<void> {
  try {
    const targetOrg = await Org.create({ aliasOrUsername: usernameOrAlias });
    const conn = targetOrg.getConnection();

    await targetOrg.refreshAuth();

    await openViaFrontdoorBridge(conn.instanceUrl, conn.accessToken as string);
  } catch (error) {
    throw new Error(`Failed to open org: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Track recently used orgs
export async function addToRecentOrgs(username: string): Promise<void> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_ORGS_KEY);
    let recentOrgs: string[] = stored ? JSON.parse(stored) : [];

    recentOrgs = recentOrgs.filter((org) => org !== username);
    recentOrgs.unshift(username);
    recentOrgs = recentOrgs.slice(0, MAX_RECENT_ORGS);

    await LocalStorage.setItem(RECENT_ORGS_KEY, JSON.stringify(recentOrgs));
  } catch (error) {
    console.error("Failed to save recent org:", error);
  }
}

// Get recently used orgs
export async function getRecentOrgs(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_ORGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Open org to specific page - supports custom paths
export async function openOrgToPage(
  usernameOrAlias: string,
  page: "home" | "setup" | "developer-console" | "custom",
  customPath?: string,
): Promise<void> {
  try {
    const targetOrg = await Org.create({ aliasOrUsername: usernameOrAlias });
    const conn = targetOrg.getConnection();

    await targetOrg.refreshAuth();

    let retUrl = "";

    switch (page) {
      case "home":
        retUrl = "/lightning/page/home";
        break;
      case "setup":
        retUrl = "/lightning/setup/SetupOneHome/home";
        break;
      case "developer-console":
        retUrl = "/_ui/common/apex/debug/ApexCSIPage";
        break;
      case "custom":
        retUrl = customPath || "/lightning/page/home";
        break;
    }

    await openViaFrontdoorBridge(conn.instanceUrl, conn.accessToken as string, retUrl);
  } catch (error) {
    console.error("Error opening org to specific page:", error);
    await sfCli(["org", "open", "-o", usernameOrAlias]);
  }
}

// Logout from org
export async function logoutOrg(usernameOrAlias: string): Promise<void> {
  try {
    await sfCli(["org", "logout", "-o", usernameOrAlias, "--no-prompt"]);
  } catch (error) {
    throw new Error(`Failed to logout: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get org details
export async function getOrgDetails(usernameOrAlias: string): Promise<OrgDetails> {
  try {
    const conn = await getConnection(usernameOrAlias);
    const fields = conn.getAuthInfo().getFields();
    const username = conn.getUsername() ?? fields.username ?? usernameOrAlias;

    // Aliases live in the alias store, not the org's auth fields.
    let alias: string | undefined;
    try {
      const stateAggregator = await StateAggregator.getInstance();
      alias = stateAggregator.aliases.get(username) ?? undefined;
    } catch {
      /* alias is cosmetic - fall back to username */
    }

    return {
      username,
      id: fields.orgId ?? "",
      instanceUrl: conn.instanceUrl,
      apiVersion: conn.getApiVersion(),
      accessToken: conn.accessToken ?? "",
      connectedStatus: "Connected",
      alias,
    };
  } catch (error) {
    throw new Error(`Failed to get org details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get org limits
export async function getOrgLimits(usernameOrAlias: string): Promise<OrgLimitsResponse> {
  try {
    const conn = await getConnection(usernameOrAlias);
    const result = await conn.request<Record<string, { Max: number; Remaining: number }>>("/limits");

    const limits: Record<string, OrgLimit> = {};
    for (const [name, limit] of Object.entries(result)) {
      limits[name] = { name, max: limit.Max, remaining: limit.Remaining };
    }

    return { limits };
  } catch (error) {
    throw new Error(`Failed to fetch org limits: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get installed packages
export async function getInstalledPackages(usernameOrAlias: string): Promise<InstalledPackage[]> {
  try {
    const stdout = await sfCli(["package", "installed", "list", "--target-org", usernameOrAlias, "--json"]);

    const result = JSON.parse(stdout);

    if (result.status !== 0) {
      throw new Error(result.message || "Failed to fetch packages");
    }

    return result.result || [];
  } catch (error) {
    // Some org types don't support package management
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not supported") || message.includes("not enabled")) {
      return [];
    }
    throw new Error(`Failed to fetch installed packages: ${message}`);
  }
}

// Get enhanced org details with edition and type
export async function getEnhancedOrgDetails(usernameOrAlias: string): Promise<EnhancedOrgDetails> {
  try {
    // Get base org details
    const baseDetails = await getOrgDetails(usernameOrAlias);

    // Query Organization object for additional metadata
    const orgQuery = "SELECT Id, OrganizationType, InstanceName, IsSandbox, NamespacePrefix FROM Organization LIMIT 1";
    const orgData = await runSOQL(orgQuery, usernameOrAlias);

    const orgRecord = orgData.records[0] as {
      OrganizationType?: string;
      IsSandbox?: boolean;
      NamespacePrefix?: string;
    };

    // Determine org type
    let orgType = "Production";
    if (orgRecord.IsSandbox) {
      orgType = "Sandbox";
    } else if (baseDetails.instanceUrl && baseDetails.instanceUrl.includes(".scratch.")) {
      orgType = "Scratch Org";
    }

    return {
      ...baseDetails,
      edition: orgRecord.OrganizationType || "Unknown Edition",
      orgType,
      isSandbox: orgRecord.IsSandbox || false,
      namespace: orgRecord.NamespacePrefix,
    };
  } catch (error) {
    throw new Error(`Failed to fetch enhanced org details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get current user info
export async function getCurrentUserInfo(usernameOrAlias: string): Promise<CurrentUserInfo> {
  try {
    // Get the authenticated username
    const orgDetails = await getOrgDetails(usernameOrAlias);
    const username = escapeSoqlString(orgDetails.username);

    // Query user info including profile and role
    const userQuery = `SELECT Id, Username, Name, Profile.Name, UserRole.Name, UserType, IsActive FROM User WHERE Username = '${username}' LIMIT 1`;
    const userData = await runSOQL(userQuery, usernameOrAlias);

    if (!userData.records || userData.records.length === 0) {
      throw new Error("User not found");
    }

    const user = userData.records[0];

    return {
      username: String(user.Username ?? ""),
      profileName: ((user.Profile as Record<string, unknown>)?.Name as string) || "Unknown Profile",
      roleName: (user.UserRole as Record<string, unknown>)?.Name as string | undefined,
      userType: (user.UserType as string) ?? "Standard",
      isActive: Boolean(user.IsActive),
    };
  } catch (error) {
    throw new Error(`Failed to fetch current user info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function enrichUsersWithFreezeStatus(
  users: SalesforceUser[],
  usernameOrAlias: string,
): Promise<SalesforceUser[]> {
  const userIds = users.map((user) => user.Id).filter(isSalesforceId);
  if (userIds.length === 0) return users;

  try {
    const idList = userIds.map((id) => `'${id}'`).join(", ");
    const result = await runSOQL(`SELECT UserId, IsFrozen FROM UserLogin WHERE UserId IN (${idList})`, usernameOrAlias);
    const frozenByUserId = new Map<string, boolean>();

    for (const record of result.records) {
      frozenByUserId.set(String(record.UserId), Boolean(record.IsFrozen));
    }

    return users.map((user) => ({
      ...user,
      IsFrozen: frozenByUserId.get(user.Id) ?? false,
    }));
  } catch {
    // Some profiles cannot read UserLogin. User actions still re-check and fail
    // with a useful Salesforce error if the admin lacks access.
    return users;
  }
}

// Search users by name, email, or username. An empty term lists standard
// users for browsing without typing: the most recently active ones plus
// recently deactivated ones (so they can be found and reactivated).
export async function searchUsers(searchTerm: string, usernameOrAlias: string): Promise<SalesforceUser[]> {
  try {
    const selectFrom = `
      SELECT Id, Name, Username, Email, Phone, Profile.Name, UserRole.Name,
             IsActive, LastLoginDate, UserType, CreatedDate
      FROM User
    `;

    if (!searchTerm) {
      const [active, inactive] = await Promise.all([
        runSOQL(
          `${selectFrom} WHERE UserType = 'Standard' AND IsActive = true ORDER BY LastLoginDate DESC NULLS LAST LIMIT 50`,
          usernameOrAlias,
        ),
        runSOQL(
          `${selectFrom} WHERE UserType = 'Standard' AND IsActive = false ORDER BY LastLoginDate DESC NULLS LAST LIMIT 25`,
          usernameOrAlias,
        ),
      ]);
      return enrichUsersWithFreezeStatus(
        [...active.records, ...inactive.records] as unknown as SalesforceUser[],
        usernameOrAlias,
      );
    }

    // Escape single quotes and SOQL LIKE wildcards for SOQL
    const escapedTerm = escapeSoqlLike(searchTerm);

    const query = `
      ${selectFrom}
      WHERE (Name LIKE '%${escapedTerm}%'
         OR Email LIKE '%${escapedTerm}%'
         OR Username LIKE '%${escapedTerm}%')
      ORDER BY Name
      LIMIT 50
    `;

    const result = await runSOQL(query, usernameOrAlias);
    return enrichUsersWithFreezeStatus(result.records as unknown as SalesforceUser[], usernameOrAlias);
  } catch (error) {
    throw new Error(`Failed to search users: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get user login history
export async function getUserLoginHistory(userId: string, usernameOrAlias: string): Promise<LoginHistoryEntry[]> {
  try {
    if (!isSalesforceId(userId)) {
      throw new Error("Invalid user ID");
    }

    const query = `
      SELECT Id, LoginTime, LoginType, Status, SourceIp, Browser, Platform
      FROM LoginHistory
      WHERE UserId = '${userId}'
      ORDER BY LoginTime DESC
      LIMIT 20
    `;

    const result = await runSOQL(query, usernameOrAlias);
    return result.records as unknown as LoginHistoryEntry[];
  } catch (error) {
    // LoginHistory may not be accessible in all orgs
    console.error("Failed to fetch login history:", error);
    return [];
  }
}

async function getUserLoginForFreeze(
  userId: string,
  usernameOrAlias: string,
): Promise<{ id: string; isFrozen: boolean }> {
  if (!isSalesforceId(userId)) {
    throw new Error("Invalid user ID");
  }

  const result = await runSOQL(
    `SELECT Id, IsFrozen FROM UserLogin WHERE UserId = '${userId}' LIMIT 1`,
    usernameOrAlias,
  );
  const userLogin = result.records[0];

  if (!userLogin?.Id) {
    throw new Error("UserLogin record not found");
  }

  return {
    id: String(userLogin.Id),
    isFrozen: Boolean(userLogin.IsFrozen),
  };
}

// Reset user password
export async function resetUserPassword(userId: string, usernameOrAlias: string): Promise<void> {
  try {
    // Note: This requires admin permissions
    const conn = await getConnection(usernameOrAlias);
    const result = await conn.sobject("User").update({ Id: userId, UserPreferencesResetPasswordOnLogin: true });
    if (!result.success) {
      throw new Error(result.errors.map((e) => e.message).join(", ") || "Failed to reset password");
    }
  } catch (error) {
    throw new Error(`Failed to reset password: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Toggle whether the user can log in without deactivating the User record.
export async function toggleUserFreeze(
  userId: string,
  currentlyFrozen: boolean | undefined,
  usernameOrAlias: string,
): Promise<boolean> {
  try {
    const userLogin = await getUserLoginForFreeze(userId, usernameOrAlias);
    const newStatus = !(currentlyFrozen ?? userLogin.isFrozen);
    const conn = await getConnection(usernameOrAlias);
    const result = await conn.sobject("UserLogin").update({ Id: userLogin.id, IsFrozen: newStatus });
    if (!result.success) {
      throw new Error(result.errors.map((e) => e.message).join(", ") || "Failed to toggle user freeze status");
    }
    return newStatus;
  } catch (error) {
    throw new Error(`Failed to toggle user freeze status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Toggle the User record's active status. This is separate from freezing login access.
export async function toggleUserActive(
  userId: string,
  currentlyActive: boolean,
  usernameOrAlias: string,
): Promise<boolean> {
  try {
    if (!isSalesforceId(userId)) {
      throw new Error("Invalid user ID");
    }

    const newStatus = !currentlyActive;
    const conn = await getConnection(usernameOrAlias);
    const result = await conn.sobject("User").update({ Id: userId, IsActive: newStatus });
    if (!result.success) {
      throw new Error(result.errors.map((e) => e.message).join(", ") || "Failed to toggle user active status");
    }
    return newStatus;
  } catch (error) {
    throw new Error(`Failed to toggle user active status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run SOQL query
export async function runSOQL(query: string, usernameOrAlias: string): Promise<QueryResult> {
  try {
    const conn = await getConnection(usernameOrAlias);
    const result = await conn.query(query);
    return result;
  } catch (error) {
    throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Search using SOSL
export async function searchSalesforce(searchTerm: string, usernameOrAlias: string) {
  try {
    const escapedTerm = escapeSoslSearchTerm(searchTerm);
    if (!escapedTerm) return [];

    const soslQuery = `FIND {${escapedTerm}*} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email), Opportunity(Id, Name, Amount), Lead(Id, Name, Email, Company), Case(Id, CaseNumber, Subject)`;

    const conn = await getConnection(usernameOrAlias);
    const result = await conn.search(soslQuery);
    return result.searchRecords ?? [];
  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const ORG_METADATA_KEY = "org-metadata";

// Get metadata for a specific org
export async function getOrgMetadata(username: string): Promise<OrgMetadata | null> {
  try {
    const stored = await LocalStorage.getItem<string>(ORG_METADATA_KEY);
    if (stored) {
      const allMetadata = JSON.parse(stored);
      return allMetadata[username] || null;
    }
  } catch (error) {
    console.error("Failed to get org metadata:", error);
  }
  return null;
}

// Get all org metadata
export async function getAllOrgMetadata(): Promise<Record<string, OrgMetadata>> {
  try {
    const stored = await LocalStorage.getItem<string>(ORG_METADATA_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to get all org metadata:", error);
    return {};
  }
}

// Check if scratch org and get expiration
export async function getScratchOrgExpiration(username: string): Promise<Date | null> {
  try {
    const authInfo = await AuthInfo.create({ username });
    const expirationDate = authInfo.getFields().expirationDate;
    return expirationDate ? new Date(expirationDate) : null;
  } catch (error) {
    // Not a scratch org or error getting info
    return null;
  }
}

// Helper to save metadata (shared between Add and Edit)
export async function saveOrgMetadata(username: string, metadata: OrgMetadata) {
  try {
    const stored = await LocalStorage.getItem<string>(ORG_METADATA_KEY);
    const allMetadata = stored ? JSON.parse(stored) : {};

    allMetadata[username] = {
      ...allMetadata[username],
      ...metadata,
    };

    await LocalStorage.setItem(ORG_METADATA_KEY, JSON.stringify(allMetadata));
  } catch (error) {
    console.error("Failed to save metadata", error);
  }
}

// Login to a new org
export async function loginOrg(alias: string, instanceUrl: string): Promise<string> {
  // 1. Run the login command
  const args = ["org", "login", "web", "--instance-url", instanceUrl, "--json"];
  if (alias) {
    args.push("--alias", alias);
  }

  const stdout = await sfCli(args);
  const result = JSON.parse(stdout);

  // 2. Return the username so we can save metadata against it
  return result.result.username;
}

// Set an org as the default target
export async function setAsDefaultOrg(usernameOrAlias: string): Promise<void> {
  try {
    // Try with the username/alias directly first
    await sfCli(["config", "set", "target-org", usernameOrAlias, "--global"]);
  } catch (error) {
    // If that fails, try without --global flag
    try {
      await sfCli(["config", "set", "target-org", usernameOrAlias]);
    } catch (secondError) {
      throw new Error(
        `Failed to set default org: ${secondError instanceof Error ? secondError.message : String(secondError)}`,
      );
    }
  }
}

// ============================================================================
// SOQL Query History & Favorites
// ============================================================================

const QUERY_HISTORY_KEY = "soql-query-history";
const QUERY_FAVORITES_KEY = "soql-query-favorites";
const MAX_QUERY_HISTORY = 50;

export interface SavedQuery {
  id: string;
  query: string;
  label?: string;
  org?: string;
  executedAt: string;
  isFavorite?: boolean;
}

// Add query to history
export async function addQueryToHistory(query: string, org: string, label?: string): Promise<void> {
  try {
    const stored = await LocalStorage.getItem<string>(QUERY_HISTORY_KEY);
    let history: SavedQuery[] = stored ? JSON.parse(stored) : [];

    // Check if query already exists in recent history (avoid duplicates)
    const existingIndex = history.findIndex((h) => h.query === query);
    if (existingIndex !== -1) {
      // Move to top, update timestamp
      const existing = history[existingIndex];
      history.splice(existingIndex, 1);
      history.unshift({
        ...existing,
        label: label ?? existing.label,
        executedAt: new Date().toISOString(),
        org,
      });
    } else {
      // Add new entry
      const newQuery: SavedQuery = {
        id: `query-${Date.now()}`,
        query,
        label,
        org,
        executedAt: new Date().toISOString(),
      };
      history.unshift(newQuery);
    }

    // Limit to MAX_QUERY_HISTORY
    history = history.slice(0, MAX_QUERY_HISTORY);

    await LocalStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save query to history:", error);
  }
}

// Get query history
export async function getQueryHistory(): Promise<SavedQuery[]> {
  try {
    const stored = await LocalStorage.getItem<string>(QUERY_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Get query favorites
export async function getQueryFavorites(): Promise<SavedQuery[]> {
  try {
    const stored = await LocalStorage.getItem<string>(QUERY_FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Toggle query favorite
export async function toggleQueryFavorite(queryId: string): Promise<void> {
  try {
    const history = await getQueryHistory();
    const favorites = await getQueryFavorites();

    // Check if already favorited
    const favoriteIndex = favorites.findIndex((f) => f.id === queryId);

    if (favoriteIndex !== -1) {
      // Remove from favorites
      favorites.splice(favoriteIndex, 1);
    } else {
      // Find query in history
      const query = history.find((q) => q.id === queryId);
      if (!query) return;

      // Add to favorites
      favorites.push({ ...query, isFavorite: true });
    }

    await LocalStorage.setItem(QUERY_FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
  }
}

// Save query with custom label
export async function saveQueryWithLabel(queryId: string, label: string): Promise<void> {
  try {
    const history = await getQueryHistory();
    const queryIndex = history.findIndex((q) => q.id === queryId);

    if (queryIndex !== -1) {
      history[queryIndex].label = label;
      await LocalStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history));

      // Update in favorites if it exists there
      const favorites = await getQueryFavorites();
      const favIndex = favorites.findIndex((f) => f.id === queryId);
      if (favIndex !== -1) {
        favorites[favIndex].label = label;
        await LocalStorage.setItem(QUERY_FAVORITES_KEY, JSON.stringify(favorites));
      }
    }
  } catch (error) {
    console.error("Failed to save query label:", error);
  }
}

// Delete query from history
export async function deleteQueryFromHistory(queryId: string): Promise<void> {
  try {
    const history = await getQueryHistory();
    const filtered = history.filter((q) => q.id !== queryId);
    await LocalStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(filtered));

    // Also remove from favorites if present
    const favorites = await getQueryFavorites();
    const filteredFavorites = favorites.filter((f) => f.id !== queryId);
    await LocalStorage.setItem(QUERY_FAVORITES_KEY, JSON.stringify(filteredFavorites));
  } catch (error) {
    console.error("Failed to delete query:", error);
  }
}

// ============================================================================
// Setup Quick Links
// ============================================================================

const RECENT_SETUP_PAGES_KEY = "recent-setup-pages";
const PINNED_SETUP_PAGES_KEY = "pinned-setup-pages";
const MAX_RECENT_SETUP_PAGES = 10;

export interface SetupPageAccess {
  pageId: string;
  accessedAt: string;
}

// Track recently accessed setup pages
export async function addToRecentSetupPages(pageId: string): Promise<void> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_SETUP_PAGES_KEY);
    let recent: SetupPageAccess[] = stored ? JSON.parse(stored) : [];

    // Remove if already exists
    recent = recent.filter((p) => p.pageId !== pageId);

    // Add to front
    recent.unshift({
      pageId,
      accessedAt: new Date().toISOString(),
    });

    // Limit size
    recent = recent.slice(0, MAX_RECENT_SETUP_PAGES);

    await LocalStorage.setItem(RECENT_SETUP_PAGES_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error("Failed to save recent setup page:", error);
  }
}

// Get recent setup pages
export async function getRecentSetupPages(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_SETUP_PAGES_KEY);
    const recent: SetupPageAccess[] = stored ? JSON.parse(stored) : [];
    return recent.map((p) => p.pageId);
  } catch {
    return [];
  }
}

// Get pinned setup pages
export async function getPinnedSetupPages(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(PINNED_SETUP_PAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Toggle pin for setup page
export async function togglePinSetupPage(pageId: string): Promise<void> {
  try {
    const pinned = await getPinnedSetupPages();
    const index = pinned.indexOf(pageId);

    if (index !== -1) {
      pinned.splice(index, 1);
    } else {
      pinned.push(pageId);
    }

    await LocalStorage.setItem(PINNED_SETUP_PAGES_KEY, JSON.stringify(pinned));
  } catch (error) {
    console.error("Failed to toggle pin:", error);
  }
}

// ============================================================================
// Quick Record Creator
// ============================================================================

const RECENT_CREATED_RECORDS_KEY = "recent-created-records";
const MAX_RECENT_RECORDS = 20;

export interface CreatedRecord {
  id: string;
  objectType: string;
  name: string;
  org: string;
  createdAt: string;
}

// Create a Salesforce record
export async function createRecord(
  objectType: string,
  fields: Record<string, string>,
  usernameOrAlias: string,
): Promise<string> {
  try {
    const conn = await getConnection(usernameOrAlias);
    const result = await conn.sobject(objectType).create(fields);

    if (!result.success) {
      throw new Error(result.errors.map((e) => e.message).join(", ") || "Record creation failed");
    }

    return result.id;
  } catch (error) {
    throw new Error(`Failed to create ${objectType}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Track recently created records
export async function addToRecentCreatedRecords(
  recordId: string,
  objectType: string,
  name: string,
  org: string,
): Promise<void> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_CREATED_RECORDS_KEY);
    let recent: CreatedRecord[] = stored ? JSON.parse(stored) : [];

    const newRecord: CreatedRecord = {
      id: recordId,
      objectType,
      name,
      org,
      createdAt: new Date().toISOString(),
    };

    recent.unshift(newRecord);
    recent = recent.slice(0, MAX_RECENT_RECORDS);

    await LocalStorage.setItem(RECENT_CREATED_RECORDS_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error("Failed to save recent record:", error);
  }
}

// Get recently created records
export async function getRecentCreatedRecords(): Promise<CreatedRecord[]> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_CREATED_RECORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

const PICKLIST_CACHE_KEY = "picklist-cache";
const PICKLIST_TTL_MS = 24 * 60 * 60 * 1000;

interface PicklistCacheEntry {
  fetchedAt: string;
  fields: Record<string, string[]>;
}

// Live picklist values per field, from the object's describe. Cached in
// LocalStorage per org+object for 24h; callers fall back to their own
// defaults when a field is absent.
export async function getPicklistValues(
  objectType: string,
  fieldNames: string[],
  usernameOrAlias: string,
): Promise<Record<string, string[]>> {
  const cacheKey = `${usernameOrAlias}:${objectType}`;

  try {
    const stored = await LocalStorage.getItem<string>(PICKLIST_CACHE_KEY);
    const cache: Record<string, PicklistCacheEntry> = stored ? JSON.parse(stored) : {};
    const entry = cache[cacheKey];

    if (entry && Date.now() - new Date(entry.fetchedAt).getTime() < PICKLIST_TTL_MS) {
      return entry.fields;
    }

    const conn = await getConnection(usernameOrAlias);
    const describe = await conn.sobject(objectType).describe();

    const fields: Record<string, string[]> = {};
    for (const fieldName of fieldNames) {
      const field = describe.fields.find((f) => f.name === fieldName);
      if (field && field.type === "picklist" && field.picklistValues) {
        fields[fieldName] = field.picklistValues.filter((v) => v.active).map((v) => v.value);
      }
    }

    cache[cacheKey] = { fetchedAt: new Date().toISOString(), fields };
    await LocalStorage.setItem(PICKLIST_CACHE_KEY, JSON.stringify(cache));

    return fields;
  } catch {
    return {};
  }
}

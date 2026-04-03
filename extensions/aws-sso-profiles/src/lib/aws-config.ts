import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import type { AccountGroup, AWSConfig, SSOProfile, SSOSession } from "./types";

/**
 * Resolve a file path, expanding ~ to the user's home directory.
 */
function resolvePath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return resolve(homedir(), filePath.slice(2));
  }
  return resolve(filePath);
}

/**
 * Parse an AWS-style INI config file without treating dots as nested keys.
 * The standard `ini` npm package splits dots in section names into nested objects,
 * which breaks profile names like `Files-Assets.OpsRW.Stag-myorg-staging`.
 */
function parseIni(content: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  let currentSection = "";

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    // Section header: [section name]
    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1]!;
      if (!result[currentSection]) {
        result[currentSection] = {};
      }
      continue;
    }

    // Key = value
    const eqIndex = line.indexOf("=");
    if (eqIndex !== -1 && currentSection) {
      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim();
      result[currentSection]![key] = value;
    }
  }

  return result;
}

/**
 * Parse the AWS config file and extract SSO sessions and profiles.
 */
export function parseAWSConfig(
  configPath: string = "~/.aws/config",
): AWSConfig {
  const resolvedPath = resolvePath(configPath);
  const content = readFileSync(resolvedPath, "utf-8");
  const parsed = parseIni(content);

  const sessions: SSOSession[] = [];
  const profiles: SSOProfile[] = [];

  // First pass: extract SSO sessions
  for (const [sectionKey, sectionValue] of Object.entries(parsed)) {
    if (typeof sectionValue !== "object" || sectionValue === null) continue;
    const section = sectionValue as Record<string, string>;

    if (sectionKey.startsWith("sso-session ")) {
      const sessionName = sectionKey.replace("sso-session ", "");
      if (section.sso_start_url) {
        sessions.push({
          sessionName,
          ssoStartUrl: section.sso_start_url,
          ssoRegion: section.sso_region || "",
          ssoRegistrationScopes: section.sso_registration_scopes,
        });
      }
    }
  }

  // Build a lookup map for sessions
  const sessionMap = new Map<string, SSOSession>();
  for (const session of sessions) {
    sessionMap.set(session.sessionName, session);
  }

  // Second pass: extract profiles with SSO configuration
  for (const [sectionKey, sectionValue] of Object.entries(parsed)) {
    if (typeof sectionValue !== "object" || sectionValue === null) continue;
    const section = sectionValue as Record<string, string>;

    // Profiles are either "profile xxx" or just "xxx" (the default profile is just "default")
    let profileName: string | null = null;
    if (sectionKey.startsWith("profile ")) {
      profileName = sectionKey.replace("profile ", "");
    } else if (sectionKey === "default") {
      profileName = "default";
    }

    if (!profileName) continue;
    if (!section.sso_account_id) continue; // Not an SSO profile

    // Get SSO details either from a referenced session or inline
    let ssoStartUrl = section.sso_start_url || "";
    let ssoRegion = section.sso_region || "";

    if (section.sso_session) {
      const session = sessionMap.get(section.sso_session);
      if (session) {
        ssoStartUrl = ssoStartUrl || session.ssoStartUrl;
        ssoRegion = ssoRegion || session.ssoRegion;
      }
    }

    if (!ssoStartUrl) continue; // Cannot determine SSO URL

    profiles.push({
      profileName,
      ssoSession: section.sso_session,
      ssoStartUrl,
      ssoRegion,
      ssoAccountId: section.sso_account_id,
      ssoRoleName: section.sso_role_name || "",
      region: section.region,
      // accountAlias and stage are set later at the group level
      accountAlias: section.account_alias,
      stage: section.stage,
    });
  }

  // Sort profiles alphabetically by name
  profiles.sort((a, b) => a.profileName.localeCompare(b.profileName));

  return { sessions, profiles };
}

/**
 * Group profiles by AWS account ID into AccountGroups.
 * Derives the account name from the longest common suffix of all profile
 * names sharing the same account ID.
 *
 * Profile naming convention: {Role}-{accountName}
 * e.g., OpsRW-stag-libraries, OpsRO-stag-libraries → account name: "stag-libraries"
 */
export function groupByAccount(profiles: SSOProfile[]): AccountGroup[] {
  const groupMap = new Map<string, SSOProfile[]>();

  for (const profile of profiles) {
    const existing = groupMap.get(profile.ssoAccountId) || [];
    existing.push(profile);
    groupMap.set(profile.ssoAccountId, existing);
  }

  const groups: AccountGroup[] = [];

  for (const [accountId, roles] of groupMap.entries()) {
    const first = roles[0]!;

    // Use explicit account_alias if set, otherwise derive from profile names
    const accountName = first.accountAlias || deriveAccountName(roles);
    const stage = first.stage || deriveStage(accountName);

    groups.push({
      accountId,
      displayName: accountName,
      accountAlias: accountName,
      stage,
      ssoStartUrl: first.ssoStartUrl,
      roles,
    });
  }

  // Sort by account name
  groups.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return groups;
}

/**
 * Derive the account name by finding the longest common suffix
 * across all profile names sharing the same account ID.
 *
 * For profiles like:
 *   OpsRW-stag-libraries
 *   OpsRO-stag-libraries
 *   DataAccessRW-stag-libraries
 * The common suffix is "stag-libraries".
 *
 * For a single profile like:
 *   LogPrivileged-myorg-logs
 * We strip the role name prefix to get "myorg-logs".
 */
function deriveAccountName(roles: SSOProfile[]): string {
  // Filter out "default" profile for derivation — it doesn't follow naming conventions
  const namedRoles = roles.filter((r) => r.profileName !== "default");
  if (namedRoles.length === 0) {
    // Only a default profile — use account ID
    return roles[0]!.ssoAccountId;
  }

  const names = namedRoles.map((r) => r.profileName);

  if (names.length === 1) {
    // Single profile: strip the role name prefix
    const profile = namedRoles[0]!;
    const rolePart = profile.ssoRoleName.replace(/\./g, "-");
    const name = profile.profileName;
    // Try removing the role name (with dots replaced by dashes) + separator
    if (name.startsWith(rolePart + "-")) {
      return name.slice(rolePart.length + 1);
    }
    // Try removing the sso_role_name directly + separator
    if (name.startsWith(profile.ssoRoleName + "-")) {
      return name.slice(profile.ssoRoleName.length + 1);
    }
    // Fallback: return profile name as-is
    return name;
  }

  // Multiple profiles: find longest common suffix
  // Split each name by "-" and compare from the right
  const splitNames = names.map((n) => n.split("-"));
  const minLen = Math.min(...splitNames.map((s) => s.length));

  const commonParts: string[] = [];
  for (let i = 1; i <= minLen; i++) {
    const part = splitNames[0]![splitNames[0]!.length - i];
    if (!part) break;
    const allMatch = splitNames.every((s) => s[s.length - i] === part);
    if (allMatch) {
      commonParts.unshift(part);
    } else {
      break;
    }
  }

  if (commonParts.length > 0) {
    return commonParts.join("-");
  }

  // Fallback: use account ID
  return roles[0]!.ssoAccountId;
}

/**
 * Stage keywords to detect in account names.
 */
const STAGE_MAP: { pattern: RegExp; label: string }[] = [
  { pattern: /^prod-|^prod$/i, label: "prod" },
  { pattern: /^stag-|^stag$/i, label: "stag" },
  { pattern: /^dev-|^dev$/i, label: "dev" },
  { pattern: /^tool-|^tool$/i, label: "tool" },
  { pattern: /^playground-|^playground$/i, label: "playground" },
  { pattern: /^sandbox-|^sandbox$/i, label: "sandbox" },
  { pattern: /^test-|^test$/i, label: "test" },
  { pattern: /^qa-|^qa$/i, label: "qa" },
  { pattern: /^uat-|^uat$/i, label: "uat" },
  // Also match stage embedded in names like "myorg-staging", "myorg-production"
  { pattern: /[-]production$|[-]prod$/i, label: "prod" },
  { pattern: /[-]staging$|[-]stag$/i, label: "stag" },
  { pattern: /[-]development$|[-]dev$/i, label: "dev" },
];

/**
 * Derive stage from the account name.
 * e.g., "stag-libraries" → "stag", "myorg-production" → "prod"
 */
function deriveStage(accountName: string): string | undefined {
  for (const { pattern, label } of STAGE_MAP) {
    if (pattern.test(accountName)) {
      return label;
    }
  }
  return undefined;
}

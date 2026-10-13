import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface AwsProfile {
  /** The profile name as used by `aws`/`assume` (without the "profile " prefix). */
  name: string;
  /** Human-friendly account name, with the known accountId/roleName suffixes stripped off `name`. */
  accountName: string;
  accountId?: string;
  roleName?: string;
  region?: string;
}

interface ConfigSection {
  name: string;
  values: Record<string, string>;
}

// AWS config profile names commonly contain dots (e.g. "Name.123456789012/Role"), which the
// `ini` package misinterprets as nested-object separators. Parse the file manually instead so
// section names and keys are kept exactly as AWS/Granted write and read them.
function parseAwsConfig(contents: string): ConfigSection[] {
  const sections: ConfigSection[] = [];
  let current: ConfigSection | null = null;

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1].trim(), values: {} };
      sections.push(current);
      continue;
    }

    if (!current) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    current.values[key] = value;
  }

  return sections;
}

function readConfigSections(): ConfigSection[] {
  const configPath = join(homedir(), ".aws", "config");
  if (!existsSync(configPath)) {
    return [];
  }
  const contents = readFileSync(configPath, "utf-8");
  return parseAwsConfig(contents);
}

function extractFromRoleArn(roleArn: string | undefined): {
  accountId?: string;
  roleName?: string;
} {
  if (!roleArn) return {};
  const match = roleArn.match(/^arn:aws:iam::(\d+):role\/(.+)$/);
  if (!match) return {};
  return { accountId: match[1], roleName: match[2] };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Granted doesn't persist the --profile-template used with `granted sso populate` anywhere, and
// the template syntax (e.g. wrapping AccountName in a `trimPrefix`) varies per setup. Rather than
// requiring users to re-enter their exact template, strip the already-known accountId/roleName
// values (and their separator) off the end of the profile name instead - this works no matter
// what template or separators were used to build it.
function stripKnownSuffix(value: string, suffix: string | undefined): string {
  if (!suffix) return value;
  const pattern = new RegExp(`[./_-]?${escapeRegExp(suffix)}$`);
  return value.replace(pattern, "");
}

function deriveAccountName(
  name: string,
  accountId: string | undefined,
  roleName: string | undefined,
): string {
  const withoutRole = stripKnownSuffix(name, roleName);
  const withoutAccountId = stripKnownSuffix(withoutRole, accountId);
  return withoutAccountId || name;
}

/** Reads and parses the profiles defined in `~/.aws/config` (the file Granted/assume reads from). */
export function listAwsProfiles(): AwsProfile[] {
  const sections = readConfigSections();
  const profiles: AwsProfile[] = [];

  for (const { name: sectionName, values } of sections) {
    const isDefault = sectionName === "default";
    const isNamedProfile = sectionName.startsWith("profile ");
    if (!isDefault && !isNamedProfile) continue;

    const name = isDefault
      ? "default"
      : sectionName.slice("profile ".length).trim();
    const fromArn = extractFromRoleArn(values.role_arn);
    const accountId =
      values.granted_sso_account_id ||
      values.sso_account_id ||
      fromArn.accountId;
    const roleName =
      values.granted_sso_role_name || values.sso_role_name || fromArn.roleName;

    profiles.push({
      name,
      accountName: deriveAccountName(name, accountId, roleName),
      accountId,
      roleName,
      region: values.region || values.granted_sso_region || values.sso_region,
    });
  }

  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

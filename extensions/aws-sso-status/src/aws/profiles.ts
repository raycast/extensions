import { AwsConfig, ConfigSection } from "./config";
import { SsoProfile } from "./types";

export function isSsoProfile(section: ConfigSection): boolean {
  return Object.keys(section).some((key) => key.startsWith("sso_"));
}

export function discoverProfiles(config: AwsConfig): SsoProfile[] {
  const profiles: SsoProfile[] = [];
  for (const [sectionName, section] of config) {
    if (sectionName !== "default" && !sectionName.startsWith("profile ")) continue;
    if (!isSsoProfile(section)) continue;
    const name =
      sectionName === "default"
        ? "default"
        : sectionName
            .slice(8)
            .trim()
            .replace(/^"(.*)"$/, "$1");
    const session = section.sso_session ? config.get(`sso-session ${section.sso_session}`) : undefined;
    const issues: string[] = [];
    if (!name || Array.from(name).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))
      issues.push("Profile name is empty or contains control characters.");
    if (section.sso_session && !session) issues.push("The referenced SSO session section is missing.");
    for (const key of ["sso_start_url", "sso_region"]) {
      if (session?.[key] && section[key] && session[key] !== section[key])
        issues.push("Profile and SSO session settings conflict.");
    }
    const startUrl = session?.sso_start_url || section.sso_start_url;
    const ssoRegion = session?.sso_region || section.sso_region;
    if (!startUrl) issues.push("SSO start URL or issuer URL is missing.");
    if (!ssoRegion) issues.push("SSO region is missing.");
    if (!/^\d{12}$/.test(section.sso_account_id || "")) issues.push("A 12-digit SSO account ID is required.");
    if (!section.sso_role_name) issues.push("SSO role name is missing.");
    if (
      [
        "role_arn",
        "credential_process",
        "credential_source",
        "source_profile",
        "web_identity_token_file",
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_session_token",
      ].some((key) => section[key])
    ) {
      issues.push("Mixed credential providers are unsupported. Use a direct SSO profile.");
    }
    profiles.push({
      name,
      accountId: section.sso_account_id,
      roleName: section.sso_role_name,
      region: section.region,
      sessionName: section.sso_session,
      startUrl,
      ssoRegion,
      issues,
    });
  }
  return profiles.sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function filterProfiles(profiles: SsoProfile[], filter?: string): SsoProfile[] {
  const names = new Set(
    (filter || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
  return names.size ? profiles.filter((profile) => names.has(profile.name)) : profiles;
}

export function selectPrimary<T extends { profile: SsoProfile }>(profiles: T[], primary?: string): T | undefined {
  if (primary?.trim()) return profiles.find((item) => item.profile.name === primary.trim());
  return profiles.find((item) => item.profile.name === "default") || profiles[0];
}

/** Open the AWS access portal, never create a federation URL containing credentials. */
export function consoleUrl(profile: SsoProfile): string | undefined {
  if (!profile.startUrl) return undefined;
  try {
    const url = new URL(profile.startUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash)
      return undefined;
    if (!/^[a-z0-9-]+\.awsapps\.com(?:\.cn)?$/i.test(url.hostname) || !/^\/start\/?$/.test(url.pathname))
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

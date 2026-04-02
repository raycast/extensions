import { SSOProfile } from "./types";

/**
 * Build the SSO portal start URL for a given profile.
 * The SSO start URL opens the AWS access portal where users can select their account/role.
 */
export function getSSOPortalUrl(profile: SSOProfile): string {
  return profile.ssoStartUrl;
}

/**
 * Build a direct console URL that pre-selects the account and role.
 * This uses the SSO start URL with a hash fragment to navigate directly.
 *
 * When AWS multi-session is enabled in the browser, each federation through
 * the SSO portal opens as a separate session tab. This URL format triggers
 * that behavior automatically.
 *
 * Format: {sso_start_url}/#/console?account_id={id}&role_name={role}
 *
 * @see https://docs.aws.amazon.com/awsconsolehelpdocs/latest/gsg/multisession.html
 */
export function getDirectConsoleUrl(profile: SSOProfile): string {
  const baseUrl = profile.ssoStartUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    account_id: profile.ssoAccountId,
    role_name: profile.ssoRoleName,
  });
  return `${baseUrl}/#/console?${params.toString()}`;
}

/**
 * Build a direct console URL for a specific region override.
 * Opens the SSO federation with the given account/role, landing in the specified region.
 */
export function getDirectConsoleUrlWithRegion(
  profile: SSOProfile,
  region: string,
): string {
  const baseUrl = profile.ssoStartUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    account_id: profile.ssoAccountId,
    role_name: profile.ssoRoleName,
    destination: `https://console.aws.amazon.com/console/home?region=${region}`,
  });
  return `${baseUrl}/#/console?${params.toString()}`;
}

/**
 * Common AWS regions grouped by geography.
 */
export const AWS_REGIONS = [
  { label: "US East (N. Virginia)", value: "us-east-1" },
  { label: "US East (Ohio)", value: "us-east-2" },
  { label: "US West (Oregon)", value: "us-west-2" },
  { label: "US West (N. California)", value: "us-west-1" },
  { label: "EU (Frankfurt)", value: "eu-central-1" },
  { label: "EU (Ireland)", value: "eu-west-1" },
  { label: "EU (London)", value: "eu-west-2" },
  { label: "EU (Paris)", value: "eu-west-3" },
  { label: "EU (Stockholm)", value: "eu-north-1" },
  { label: "EU (Milan)", value: "eu-south-1" },
  { label: "Asia Pacific (Tokyo)", value: "ap-northeast-1" },
  { label: "Asia Pacific (Singapore)", value: "ap-southeast-1" },
  { label: "Asia Pacific (Sydney)", value: "ap-southeast-2" },
  { label: "Asia Pacific (Mumbai)", value: "ap-south-1" },
  { label: "Asia Pacific (Seoul)", value: "ap-northeast-2" },
  { label: "Canada (Central)", value: "ca-central-1" },
  { label: "South America (São Paulo)", value: "sa-east-1" },
] as const;

/**
 * Build a CLI export command for setting the profile.
 */
export function getExportCommand(profile: SSOProfile): string {
  return `export AWS_PROFILE=${profile.profileName}`;
}

/**
 * Build direct console URLs for multiple profiles.
 * Each URL federates through the SSO portal, and with multi-session enabled
 * in the browser, each one opens as a separate session tab (up to 5 sessions).
 *
 * @see https://docs.aws.amazon.com/awsconsolehelpdocs/latest/gsg/multisession.html
 */
export function getMultiSessionUrls(profiles: SSOProfile[]): string[] {
  return profiles.slice(0, 5).map(getDirectConsoleUrl);
}

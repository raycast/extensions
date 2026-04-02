/**
 * Represents an AWS SSO session configuration from ~/.aws/config
 * e.g. [sso-session my-sso]
 */
export interface SSOSession {
  sessionName: string;
  ssoStartUrl: string;
  ssoRegion: string;
  ssoRegistrationScopes?: string;
}

/**
 * Represents an AWS SSO profile from ~/.aws/config
 * e.g. [profile dev-account]
 */
export interface SSOProfile {
  /** The profile name (e.g., "dev-account") */
  profileName: string;
  /** Reference to an sso-session name */
  ssoSession?: string;
  /** The SSO start URL (from session or inline) */
  ssoStartUrl: string;
  /** The SSO region (from session or inline) */
  ssoRegion: string;
  /** The AWS account ID (e.g., "111111111111") */
  ssoAccountId: string;
  /** The IAM role name to assume (e.g., "AWSAdministratorAccess") */
  ssoRoleName: string;
  /** The default region for this profile */
  region?: string;
  /** Human-readable account alias (custom field or derived from profile name) */
  accountAlias?: string;
  /** Stage / environment (e.g., dev, staging, prod — derived from profile name or custom field) */
  stage?: string;
}

/**
 * An account group: one AWS account with potentially multiple roles/profiles.
 * Displayed as a single row in the top-level list.
 */
export interface AccountGroup {
  /** The AWS account ID (e.g., "111111111111") */
  accountId: string;
  /** Human-readable display name (alias + stage, or profile name fallback) */
  displayName: string;
  /** Account alias (e.g., "mycompany") */
  accountAlias?: string;
  /** Stage / environment (e.g., "production", "development") */
  stage?: string;
  /** The SSO start URL for this account */
  ssoStartUrl: string;
  /** All profiles (roles) available for this account */
  roles: SSOProfile[];
}

/**
 * Parsed result from the AWS config file
 */
export interface AWSConfig {
  sessions: SSOSession[];
  profiles: SSOProfile[];
}

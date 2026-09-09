export interface Profile {
  name: string;
  region?: string;
}
export interface SsoProfile extends Profile {
  accountId?: string;
  roleName?: string;
  sessionName?: string;
  startUrl?: string;
  ssoRegion?: string;
  issues: string[];
}
export type CredentialStatus =
  | "Signed In"
  | "Expiring Soon"
  | "Expired"
  | "Not Signed In"
  | "Invalid Configuration"
  | "AWS CLI Not Found"
  | "Checking"
  | "Unknown";
export interface ProfileStatus {
  stale?: boolean;
  lastSuccessAt?: string;
  nextRetryAt?: number;
  failureKind?: "missing" | "timeout" | "network" | "login-required" | "configuration" | "unsupported" | "failed";
  profile: SsoProfile;
  status: CredentialStatus;
  expiration?: string;
  checkedAt?: string;
  message?: string;
}
export interface Settings {
  primaryProfile?: string;
  profileFilter?: string;
  threshold: string;
  menuBarStyle: string;
  awsCliPath?: string;
  notifyOnSignOut?: boolean;
}
export interface Snapshot {
  profiles: ProfileStatus[];
  notice?: string;
  error?: "Invalid Configuration" | "AWS CLI Not Found" | "Unknown";
}

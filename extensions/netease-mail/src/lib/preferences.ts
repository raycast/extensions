import { getPreferenceValues } from "@raycast/api";

export type MailPreferences = {
  emailAddress: string;
  authorizationCode: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  defaultSearchDays: number;
};

export function getMailPreferences(): MailPreferences {
  const preferences = getPreferenceValues<Preferences>();

  return {
    emailAddress: preferences.emailAddress?.trim() || "",
    authorizationCode: preferences.authorizationCode?.trim() || "",
    imapHost: preferences.imapHost?.trim() || "imap.163.com",
    imapPort: parsePort(preferences.imapPort, 993),
    smtpHost: preferences.smtpHost?.trim() || "smtp.163.com",
    smtpPort: parsePort(preferences.smtpPort, 465),
    defaultSearchDays: Math.max(1, parsePort(preferences.defaultSearchDays, 14)),
  };
}

export function hasMailCredentials(): boolean {
  const preferences = getMailPreferences();
  return Boolean(preferences.emailAddress && preferences.authorizationCode);
}

export class MissingMailCredentialsError extends Error {
  constructor() {
    super("NetEase Mail email address and authorization code are not configured.");
    this.name = "MissingMailCredentialsError";
  }
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

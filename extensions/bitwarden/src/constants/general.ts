/* Put constants that you feel like they still don't deserve a file of their own here */

export const DEFAULT_SERVER_URL = "https://bitwarden.com";

export const HIDDEN_PLACEHOLDER = "HIDDEN-VALUE";

export const LOCAL_STORAGE_KEY = {
  PASSWORD_OPTIONS: "bw-generate-password-options",
  PASSWORD_ONE_TIME_WARNING: "bw-generate-password-warning-accepted",
  SESSION_TOKEN: "sessionToken",
  REPROMPT_HASH: "sessionRepromptHash",
  SERVER_URL: "cliServer",
  LAST_ACTIVITY_TIME: "lastActivityTime",
  VAULT_LOCK_REASON: "vaultLockReason",
};

export const ERRORS = {
  CLINotFound: "CLINotFound",
} as const;

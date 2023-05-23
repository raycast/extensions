/* Put constants that you feel like they still don't deserve a file of their own here */

import { Keyboard } from "@raycast/api";

export const DEFAULT_SERVER_URL = "https://bitwarden.com";

export const SENSITIVE_VALUE_PLACEHOLDER = "HIDDEN-VALUE";

export const LOCAL_STORAGE_KEY = {
  PASSWORD_OPTIONS: "bw-generate-password-options",
  PASSWORD_ONE_TIME_WARNING: "bw-generate-password-warning-accepted",
  SESSION_TOKEN: "sessionToken",
  REPROMPT_HASH: "sessionRepromptHash",
  SERVER_URL: "cliServer",
  LAST_ACTIVITY_TIME: "lastActivityTime",
  VAULT_LOCK_REASON: "vaultLockReason",
};

export const VAULT_LOCK_MESSAGES = {
  TIMEOUT: "Vault timed out due to inactivity",
  MANUAL: "Manually locked by the user",
};

export const SHORTCUT_KEY_SEQUENCE: Keyboard.Shortcut["key"][] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "+",
  "-",
  ".",
  ",",
];

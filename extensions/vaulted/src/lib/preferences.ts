import { getPreferenceValues } from "@raycast/api";
import { validateHost } from "./validation";
import {
  type Expiry,
  type MaxViews,
  VALID_EXPIRY,
  VALID_VIEWS,
} from "./secret-config";

export type { Expiry, MaxViews } from "./secret-config";
export { EXPIRY_SECONDS } from "./secret-config";

export interface VaultedPreferences {
  host: string;
  defaultViews: MaxViews;
  defaultExpiry: Expiry;
  autoCopy: boolean;
  openInBrowser: boolean;
  confirmConsume: boolean;
}

const DEFAULT_HOST = "https://vaulted.fyi";

export function getPrefs(): VaultedPreferences {
  const raw = getPreferenceValues<Preferences>();
  const host = (raw.host || DEFAULT_HOST).trim().replace(/\/+$/, "");
  validateHost(host);

  return {
    host,
    defaultViews: parseViews(raw.defaultViews),
    defaultExpiry: parseExpiry(raw.defaultExpiry),
    autoCopy: raw.autoCopy,
    openInBrowser: raw.openInBrowser,
    confirmConsume: raw.confirmConsume,
  };
}

function parseViews(value: Preferences["defaultViews"]): MaxViews {
  const n = Number(value);
  return VALID_VIEWS.includes(n as MaxViews) ? (n as MaxViews) : 1;
}

function parseExpiry(value: Preferences["defaultExpiry"]): Expiry {
  return VALID_EXPIRY.includes(value as Expiry) ? (value as Expiry) : "24h";
}

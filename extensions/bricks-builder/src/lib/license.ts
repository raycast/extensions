import { LocalStorage } from "@raycast/api";
import { Site } from "./sites";
import { HELPER_NAMESPACE, wpRequest } from "./wordpress";

/** Where to buy Pro: the product page on martej.com, with the plans. */
export const BUY_URL = "https://martej.com/bricks-raycast";

/** Helper plugin version that added licenses. */
export const LICENSE_VERSION = "1.6.0";

/** A site's Bricks Raycast Pro license, as the helper plugin reports it. */
export interface LicenseSummary {
  active: boolean;
  /** "none" without a key; otherwise active, inactive, expired, disabled or a license server error code. */
  status: string;
  expires_at: string | null;
  checked_at: string | null;
  /** Why the last check failed, if it did. */
  error: string;
  buy_url: string;
  settings_url: string;
  /** Administrators only. */
  key_hint?: string | null;
  activations?: number | null;
  activation_limit?: number | null;
}

/** Site Audit, element and dynamic data search, Form Submissions, the Template Library and site tools answer this without a Pro license. */
export class ProLicenseError extends Error {
  constructor(
    readonly site: Site,
    message: string,
  ) {
    super(message);
  }
}

export const PRO_REQUIRED_CODE = "bricks_raycast_pro_required";

export const getLicense = (site: Site, refresh = false) =>
  wpRequest<LicenseSummary>(site, `/${HELPER_NAMESPACE}/license`, refresh ? { refresh: "1" } : {});

export const activateLicense = (site: Site, key: string) =>
  wpRequest<LicenseSummary>(site, `/${HELPER_NAMESPACE}/license`, {}, { method: "POST", body: { key } });

export const deactivateLicense = (site: Site) =>
  wpRequest<LicenseSummary>(site, `/${HELPER_NAMESPACE}/license`, {}, { method: "DELETE" });

/** "Pro", "Free", "Expired"… for tags. */
export function licenseLabel(license: LicenseSummary): string {
  if (license.active) return "Pro";
  if (license.status === "none") return "Free";
  return license.status.charAt(0).toUpperCase() + license.status.slice(1).replace(/_/g, " ");
}

const KEY_STORAGE = "license-key";

/** The license key you last activated, so it can go on more sites without typing it again. */
export const getSavedKey = () => LocalStorage.getItem<string>(KEY_STORAGE);
export const saveKey = (key: string) => LocalStorage.setItem(KEY_STORAGE, key.trim());
export const forgetKey = () => LocalStorage.removeItem(KEY_STORAGE);

/** "…1A2B" */
export const keyHint = (key: string) => `…${key.slice(-4)}`;

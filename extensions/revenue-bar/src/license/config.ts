/**
 * Revenue Bar Pro is sold as a Lemon Squeezy license key.
 *
 * All three constants below are set. If any is ever unset, the extension falls back to the free tier for everyone: a
 * license key from any other Lemon Squeezy store would otherwise validate too, so nothing is unlocked until the IDs
 * can be checked.
 */

/** Lemon Squeezy store "Revenue Bar Pro" (revenuebarpro.lemonsqueezy.com). */
export const LEMON_SQUEEZY_STORE_ID: number | null = 493372;

/** Lemon Squeezy product "Revenue Bar Pro" (one-time, license keys, unlimited length, 3 activations). */
export const LEMON_SQUEEZY_PRODUCT_ID: number | null = 1424288;

/** Lemon Squeezy checkout for "Revenue Bar Pro" (published 2026-10-09). */
export const CHECKOUT_URL: string =
  "https://revenuebarpro.lemonsqueezy.com/checkout/buy/8351e2bc-e749-4603-bb7b-d27815452e09";

/** Shown when the checkout URL is not set yet, so the Buy action still goes somewhere sensible. */
export const FALLBACK_INFO_URL = "https://www.raycast.com/felitrejos/revenue-bar";

export type LicenseConfig = {
  storeId: number | null;
  productId: number | null;
  checkoutUrl: string;
};

export const LICENSE_CONFIG: LicenseConfig = {
  storeId: LEMON_SQUEEZY_STORE_ID,
  productId: LEMON_SQUEEZY_PRODUCT_ID,
  checkoutUrl: CHECKOUT_URL,
};

export function isLicensingConfigured(config: LicenseConfig = LICENSE_CONFIG): boolean {
  return config.storeId !== null && config.productId !== null && config.checkoutUrl.trim().length > 0;
}

export function buyUrl(config: LicenseConfig = LICENSE_CONFIG): string {
  return config.checkoutUrl.trim() || FALLBACK_INFO_URL;
}

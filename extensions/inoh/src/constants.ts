import { loadLocalBackendConfig } from "./lib/local-backend-config";

/**
 * Development-only overrides from the gitignored `assets/local-config.json`
 * (local Supabase Docker stack). Empty in installed and published builds, so
 * every export below defaults to production.
 */
const localBackend = loadLocalBackendConfig();

/** Supabase project credentials. */
export const SUPABASE_URL = localBackend.supabaseUrl ?? "https://fsgiabbxanlcaqpgrrki.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  localBackend.supabasePublishableKey ?? "sb_publishable_DvcLzEYwjUKsuGtzSJbivA_FLaRrKnh";

export const IMAGE_BUCKET = "images";
export const AUDIO_BUCKET = "audio";

export const WEBSITE_URL = "https://inoh.app";

/**
 * Product pages for the other Inoh ecosystem apps, listed in the Apps action
 * section.
 */
export const IOS_APP_URL = "https://apps.apple.com/app/id6799947889";
export const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/fihdhfkhbocbgmnhdigkljknabnjeoai?utm_source=item-share-cb";
export const OBSIDIAN_PLUGIN_URL = "https://obsidian.md/plugins?id=inoh";

/**
 * Plan pages in the Inoh web app. Upgrading and managing a subscription
 * happen there, not in the extension: the plans page lists live prices and
 * runs Stripe checkout; Plan & Billing is where subscribers upgrade,
 * downgrade, cancel, resume, and fix their card.
 */
export const PLANS_URL = `${WEBSITE_URL}/subscription-plan`;
export const BILLING_URL = `${WEBSITE_URL}/billing`;

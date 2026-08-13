import { loadLocalBackendConfig } from "./lib/local-backend-config";

/**
 * Development-only overrides from the gitignored `assets/local-config.json`
 * (local Supabase Docker stack + Stripe test prices). Empty in installed and
 * published builds, so every export below defaults to production.
 */
const localBackend = loadLocalBackendConfig();

/** Supabase project credentials. */
export const SUPABASE_URL = localBackend.supabaseUrl ?? "https://fsgiabbxanlcaqpgrrki.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  localBackend.supabasePublishableKey ?? "sb_publishable_DvcLzEYwjUKsuGtzSJbivA_FLaRrKnh";

export const IMAGE_BUCKET = "images";
export const AUDIO_BUCKET = "audio";

/**
 * Maximum number of cards a free-plan user can hold across all decks.
 * Mirrors `FREE_CARD_LIMIT` in the Inoh app (`src/constants/plan-limits.ts`)
 * and is enforced server-side by a trigger on `user_cards`.
 */
export const FREE_CARD_LIMIT = 300;

/** Stripe live price IDs for Inoh Pro. */
export const STRIPE_PRICE_MONTHLY = localBackend.stripePriceMonthly ?? "price_1TFIA4RspoCDdtuBLdEpwiH8";
export const STRIPE_PRICE_ANNUAL = localBackend.stripePriceAnnual ?? "price_1TFIA4RspoCDdtuBkJ1RdSAI";

/** Where new users create an account and existing users manage their subscription. */
export const APP_STORE_URL = "https://apps.apple.com/app/id6757024294";
export const WEBSITE_URL = "https://inoh.app";

/**
 * Product pages for the other Inoh ecosystem apps, listed in the Apps action
 * section. The iOS app (mid-rebrand) has no URL yet and surfaces as
 * "Coming soon" — add its constant once live.
 */
export const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/fihdhfkhbocbgmnhdigkljknabnjeoai?utm_source=item-share-cb";
export const OBSIDIAN_PLUGIN_URL = "https://obsidian.md/plugins?id=inoh";
export const CHECKOUT_SUCCESS_URL = `${WEBSITE_URL}/checkout-success`;
export const CHECKOUT_CANCEL_URL = `${WEBSITE_URL}/checkout-cancel`;

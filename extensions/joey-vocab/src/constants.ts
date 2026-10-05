/**
 * Supabase project credentials per environment. The active set is selected
 * automatically in {@link ./lib/config} based on whether the extension is
 * running as a development command or an installed/published one.
 */
export const PROD_SUPABASE_URL = "https://fsgiabbxanlcaqpgrrki.supabase.co";
export const PROD_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DvcLzEYwjUKsuGtzSJbivA_FLaRrKnh";

/**
 * Local Docker Supabase. The publishable key is the shared default the Supabase
 * CLI generates for every local stack, so it is the same on any machine.
 */
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
export const LOCAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export const IMAGE_BUCKET = "images";
export const AUDIO_BUCKET = "audio";

/**
 * Maximum number of cards a free-plan user can hold across all decks.
 * Mirrors `FREE_CARD_LIMIT` in the Joey app (`src/constants/plan-limits.ts`)
 * and is enforced server-side by a trigger on `user_cards`.
 */
export const FREE_CARD_LIMIT = 300;

/**
 * Stripe price IDs for Joey Pro. Production uses live prices; local/development
 * uses Stripe test-mode prices (matching the `sk_test_` key on the local stack).
 * The active pair is selected per environment in {@link ./lib/config}.
 */
export const PROD_STRIPE_PRICE_MONTHLY = "price_1TFIA4RspoCDdtuBLdEpwiH8";
export const PROD_STRIPE_PRICE_ANNUAL = "price_1TFIA4RspoCDdtuBkJ1RdSAI";
export const LOCAL_STRIPE_PRICE_MONTHLY = "price_1TEd4ARspoCDdtuBNg19vlqD";
export const LOCAL_STRIPE_PRICE_ANNUAL = "price_1TEdDkRspoCDdtuBwAkJZurW";

/** Where new users create an account and existing users manage their subscription. */
export const APP_STORE_URL = "https://apps.apple.com/app/id6757024294";
export const WEBSITE_URL = "https://joey-website-one.vercel.app";
export const CHECKOUT_SUCCESS_URL = `${WEBSITE_URL}/checkout-success.html`;
export const CHECKOUT_CANCEL_URL = `${WEBSITE_URL}/checkout-cancel.html`;

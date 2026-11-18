import { loadLocalBackendConfig } from "./lib/local-backend-config";

/**
 * Development-only overrides from the gitignored `assets/local-config.json`
 * (local Supabase Docker stack, locally served web app). Empty in installed
 * and published builds, so every export below defaults to production.
 */
const localBackend = loadLocalBackendConfig();

/** Supabase project credentials. */
export const SUPABASE_URL = localBackend.supabaseUrl ?? "https://fsgiabbxanlcaqpgrrki.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  localBackend.supabasePublishableKey ?? "sb_publishable_DvcLzEYwjUKsuGtzSJbivA_FLaRrKnh";

export const IMAGE_BUCKET = "images";
export const AUDIO_BUCKET = "audio";

/**
 * The Inoh web app. Its own host since PRI-20768: inoh.app serves the
 * marketing site and the public dictionary pages, app.inoh.app serves the app.
 * The plan pages further down are app routes and derive from this; the store
 * links in between are external and do not.
 *
 * Reason: overridable through `webAppUrl`, because a development build writes
 * drafts and cards into the local Supabase stack, and production's web app
 * reads none of them. Opening the locally served app instead keeps both halves
 * of a test on the same data.
 */
export const WEB_APP_URL = localBackend.webAppUrl ?? "https://app.inoh.app";

/**
 * Product pages for the other Inoh ecosystem apps, listed in the Apps action
 * section.
 */
export const IOS_APP_URL = "https://apps.apple.com/app/id6799947889";
export const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/fihdhfkhbocbgmnhdigkljknabnjeoai?utm_source=item-share-cb";
export const OBSIDIAN_PLUGIN_URL = "https://obsidian.md/plugins?id=inoh";

/**
 * How to connect an AI assistant to Inoh over MCP, client by client.
 *
 * Reason: the docs host's front page is that walkthrough, so this is the docs
 * root rather than the server address `https://mcp.inoh.app/mcp`, which
 * answers a browser with a 405 and tells a user nothing.
 */
export const CONNECT_AN_AI_URL = "https://docs.inoh.app";

/** Opens the Claude connection guide directly. */
export const CONNECT_CLAUDE_URL = `${CONNECT_AN_AI_URL}/#claude`;

/**
 * The two halves of the library in the Inoh web app: the shared dictionary
 * every card is drawn from, and the user's own deck of them. Offered from a
 * search that has nothing to act on yet, where browsing is the alternative to
 * typing.
 */
export const DICTIONARY_URL = `${WEB_APP_URL}/dictionary`;
export const DECK_URL = `${WEB_APP_URL}/deck`;

/**
 * The account's own page in the Inoh web app: the name on the account, the
 * plan, the connected apps, and deleting the account all live there, so the
 * account action opens it rather than restating any of it here.
 */
export const SETTINGS_URL = `${WEB_APP_URL}/settings`;

/**
 * Plan pages in the Inoh web app. Upgrading and managing a subscription
 * happen there, not in the extension: the plans page lists live prices and
 * runs Stripe checkout; Plan & Billing is where subscribers upgrade,
 * downgrade, cancel, resume, and fix their card.
 */
export const PLANS_URL = `${WEB_APP_URL}/subscription-plan`;
export const BILLING_URL = `${WEB_APP_URL}/billing`;

/**
 * The web app's Generate tab: the same composer the Generate command here
 * reads, on a bigger screen.
 */
export const GENERATE_URL = `${WEB_APP_URL}/generate`;

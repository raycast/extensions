import pkg from "../../package.json";

// GTD Brain is one product across platforms: the same Client id as the web tenant, the mobile
// apps and the Chrome extension, so the backend scopes this extension's data to the same
// Firestore user. x-platform is what tells the surfaces apart in BigQuery.
export const CLIENT = "gtdbrain";
export const PLATFORM = "raycast-extension";
export const VERSION: string = pkg.version;

// The value every event and outbound link carries so this surface is unambiguous in the logs.
export const SURFACE = "raycast";
export const SOURCE = "raycast-extension";

export const PRODUCTION_API_BASE = "https://api.minosin.com";
export const DASHBOARD_ORIGIN = "https://dashboard.gtdbrain.com";
export const SITE_ORIGIN = "https://gtdbrain.com";

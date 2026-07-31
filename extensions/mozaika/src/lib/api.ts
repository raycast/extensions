import { getPreferenceValues } from "@raycast/api";

// Mozaika public API + funnel destinations (single source of truth).
export const MOZAIKA = "https://mozaika.design";
export const PRICING_URL = `${MOZAIKA}/pricing`;
export const BROWSE_URL = `${MOZAIKA}/browse`;
export const CONNECT_URL = `${MOZAIKA}/connect`;

/** Optional Founder/Pro token → unlimited decodes (the backend lifts the daily IP cap). */
export function authHeaders(): Record<string, string> {
  const { mozaikaToken } = getPreferenceValues<Preferences>();
  const token = (mozaikaToken ?? "").trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Thumbnails are stored as same-origin /api/files paths — make them absolute for Raycast. */
export function absUrl(u?: string): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${MOZAIKA}${u.startsWith("/") ? "" : "/"}${u}`;
}

export function normalizeSiteInput(input: string): string {
  const u = (input ?? "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function host(u?: string): string {
  try {
    return new URL(u ?? "").host.replace(/^www\./, "");
  } catch {
    return u ?? "";
  }
}

export function decodeEndpoint(siteUrl: string): string {
  return `${MOZAIKA}/api/decode?url=${encodeURIComponent(siteUrl)}`;
}

export function inspirationsEndpoint(query: string, limit = 30): string {
  const p = new URLSearchParams({ limit: String(limit), kind: "page" });
  if (query.trim()) p.set("q", query.trim());
  return `${MOZAIKA}/api/inspirations?${p.toString()}`;
}

export function detailUrl(slug: string): string {
  return `${MOZAIKA}/inspiration/${slug}`;
}

// ---- types (mirror backend/decode.py + the Inspiration model) ----
export interface DesignSystem {
  site?: string;
  url?: string;
  color_scheme?: string;
  confidence?: number;
  fonts?: string[];
  font_roles?: Record<string, string>;
  colors?: Record<string, string | undefined>;
  type_scale?: { h1?: string; h2?: string; body?: string };
  spacing?: { base_unit?: string; radius?: string };
  radius?: string;
  primary_button?: { bg?: string; text?: string; radius?: string; shadow?: string };
  framework?: string;
  personality?: { tone?: string; energy?: string };
  source?: string;
  cached?: boolean;
}

export interface Inspiration {
  slug: string;
  title: string;
  site: string;
  site_slug: string;
  site_url: string;
  thumbnail: string;
  thumb?: string;
  tags?: string[];
  page_types?: string[];
  fonts?: string[];
}

/** Drop noise the agent doesn't need before copying/serializing. */
export function strip(ds: DesignSystem): Partial<DesignSystem> {
  const c: DesignSystem = { ...ds };
  delete c.cached;
  delete c.source;
  delete c.confidence;
  return c;
}

/** The "build to this spec" prompt — mirrors the Chrome extension. */
export function agentPrompt(ds: DesignSystem): string {
  return (
    `Design like ${ds.site} (${host(ds.url)}). Match this real design system exactly — ` +
    `use the colors by their role, the fonts, the type scale and the radii. ` +
    `Don't invent values; build to this spec:\n\n` +
    JSON.stringify(strip(ds), null, 2)
  );
}

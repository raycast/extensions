// The one door to BABAV. Same connection key as BABAV Finder and BABAV Compose,
// sent as a Bearer token to the key-auth /ext/raycast routes.
import { getPreferenceValues, LocalStorage, openExtensionPreferences, showToast, Toast } from "@raycast/api";

export const DEFAULT_API_BASE = "https://babav-api-250906620051.us-west1.run.app";
const BRAND_KEY = "babav.brandId";
const BRAND_NAME_KEY = "babav.brandName";
// A key pasted on the Connect screen (RaySetupB). Raycast cannot write preferences from code, so a
// pasted key lives in LocalStorage; a key typed into the extension preferences always wins.
const PASTED_KEY = "babav.connectionKey";
// Tail of the last key the server accepted, so a later 401 can say "turned off" (it used to work)
// instead of "didn't work" (never did). The server answers invalid_api_key for both.
const GOOD_TAIL = "babav.goodKeyTail";

/** Where the key lives: BABAV › Settings › Extensions & apps. */
export const KEY_PAGE_URL = "https://app.babav.co/dashboard#settings?cat=extension";

type Prefs = { connectionKey?: string; apiBase?: string };

/** "Sign in with BABAV" (GET /ext/auth/connect): phone sign-in that ends on a Copy key button,
 *  for people who would rather not open the dashboard. Same API base the commands use. */
export function signInUrl(): string {
  const p = getPreferenceValues<Prefs>();
  const base = ((p.apiBase || "").trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
  return `${base}/ext/auth/connect?app=raycast`;
}

/** The key the commands use: preferences first, then one pasted on the Connect screen. */
export async function connectionKey(): Promise<string> {
  const p = getPreferenceValues<Prefs>();
  const fromPrefs = (p.connectionKey || "").trim();
  if (fromPrefs) return fromPrefs;
  return ((await LocalStorage.getItem<string>(PASTED_KEY)) || "").trim();
}

export async function savePastedKey(key: string): Promise<void> {
  await LocalStorage.setItem(PASTED_KEY, key.trim());
}

export async function forgetPastedKey(): Promise<void> {
  await LocalStorage.removeItem(PASTED_KEY);
}

export function looksLikeKey(key: string): boolean {
  return /^bvk_[A-Za-z0-9_-]{16,}$/.test((key || "").trim());
}

/** bvk_8f2x••••••7Q2 — never show a whole key. */
export function maskKey(key: string): string {
  const k = (key || "").trim();
  if (k.length < 12) return k ? "••••••" : "";
  return `${k.slice(0, 8)}••••••${k.slice(-3)}`;
}

async function keyWorkedBefore(key: string): Promise<boolean> {
  const tail = (await LocalStorage.getItem<string>(GOOD_TAIL)) || "";
  return !!tail && tail === key.slice(-6);
}

export class BabavError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function base(): string {
  const p = getPreferenceValues<Prefs>();
  return (p.apiBase || DEFAULT_API_BASE).trim().replace(/\/+$/, "");
}

export async function activeBrand(): Promise<{ id: string; name: string }> {
  const id = (await LocalStorage.getItem<string>(BRAND_KEY)) || "";
  const name = (await LocalStorage.getItem<string>(BRAND_NAME_KEY)) || "";
  return { id, name };
}

export async function setActiveBrand(id: string, name: string): Promise<void> {
  await LocalStorage.setItem(BRAND_KEY, id);
  await LocalStorage.setItem(BRAND_NAME_KEY, name);
}

function friendly(status: number, code: string, message: string, workedBefore = false): string {
  // Same words as the locked extension key states (KeyStates board).
  if (status === 401 && workedBefore)
    return "Your key was turned off. Someone on your brand rolled or revoked it. Paste the new key.";
  if (status === 401) return "That key didn’t work. It starts with bvk_ and is on Settings › Extensions & apps.";
  if (status === 402) return "Your BABAV plan is not active. Open BABAV to sort billing.";
  if (status === 403 && code === "not_your_brand") return "That brand is not linked to this key. Run Switch Brand.";
  if (status === 429) return "Too many requests. Wait a minute and try again.";
  return message || code || `BABAV answered ${status}`;
}

export async function api<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; key?: string } = {},
): Promise<T> {
  const key = (init.key || (await connectionKey())).trim();
  if (!key) throw new BabavError(401, "missing_api_key", "Connect your BABAV account first.");
  const brand = init.key ? { id: "", name: "" } : await activeBrand();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "X-BV-Client-Version": "raycast/0.1.0",
  };
  if (brand.id) headers["X-Babav-Brand"] = brand.id;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${base()}/ext/raycast${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  if (!res.ok || json.ok === false) {
    const code = String(json.error || "");
    // A remembered brand that is no longer reachable: forget it so the next call uses the key's own brand.
    if (res.status === 403 && code === "not_your_brand") await setActiveBrand("", "");
    const before = res.status === 401 ? await keyWorkedBefore(key) : false;
    throw new BabavError(res.status, code, friendly(res.status, code, String(json.message || ""), before));
  }
  await LocalStorage.setItem(GOOD_TAIL, key.slice(-6));
  return json as T;
}

export async function showError(err: unknown, title = "BABAV") {
  const e = err as BabavError;
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: e && e.message ? e.message : String(err),
    primaryAction:
      e && e.status === 401
        ? {
            title: "Paste the New Key",
            onAction: async () => {
              await forgetPastedKey();
              await openExtensionPreferences();
            },
          }
        : undefined,
  });
}

// ── shapes the API returns ──────────────────────────────────────────────────────

export type Person = {
  key: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  channel: string;
  source: string;
  stage: string;
  notes: string;
  handle: string;
  title: string;
  website: string;
  socials: string[];
  lead_score: number | null;
  last_text: string;
  last_seen: string;
  is_lead?: boolean;
};

export type LastMessage = { from: "us" | "them"; text: string; at: string; channel: string } | null;

export type QueueItem = {
  kind: "draft" | "post";
  id: string;
  channel: string;
  action: string;
  text: string;
  to: string;
  incoming: string;
  created_at: string;
  post_at?: string;
};

export type Me = { brand: string; customer_id: string; key_brand_id: string; dashboard_url: string };

export type Counts = { brand: string; hot_leads: number; missed_calls: number; waiting_approval: number };

export type Brand = { customer_id: string; name: string; is_master: boolean; is_active: boolean };

export type Slot = { start: string; label: string };

// ── small helpers ───────────────────────────────────────────────────────────────

export function displayName(p: Pick<Person, "name" | "email" | "phone" | "handle" | "key">): string {
  return p.name || p.email || p.phone || p.handle || p.key;
}

export function when(iso: string): string {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  if (mins < 60 * 24 * 30) return `${Math.round(mins / 1440)}d ago`;
  return new Date(t).toLocaleDateString();
}

/** A light client-side read of pasted text, only to pre-fill the Add Lead form. The server decides. */
export function parseLeadText(text: string): { name: string; email: string; phone: string; company: string } {
  const t = String(text || "").slice(0, 5000);
  const email = (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [""])[0].toLowerCase();
  const phone = (t.match(/(\+?\d[\d\s().-]{7,}\d)/) || [""])[0].trim();
  const lines = t
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const nameLine = lines.find((l) => l.length <= 60 && !/[@\d/:]/.test(l) && l.split(/\s+/).length <= 5) || "";
  const companyLine =
    lines.find((l) => l !== nameLine && /,|\b(inc|llc|ltd|co|company|studio)\b/i.test(l) && !/@/.test(l)) || "";
  const company = companyLine.includes(",") ? companyLine.split(",").slice(-1)[0].trim() : companyLine;
  return { name: nameLine, email, phone, company };
}

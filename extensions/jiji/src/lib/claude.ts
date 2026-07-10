import { Metric, ModelUsage, Usage } from "./types";

const ORGS_URL = "https://claude.ai/api/organizations";
const usageURL = (orgId: string) => `https://claude.ai/api/organizations/${orgId}/usage`;

// A Safari user-agent, mirroring jiji's WKWebView, to reduce bot-blocking on
// claude.ai's edge (Cloudflare).
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15";

/** Session cookie is missing/expired, or claude.ai redirected us to /login. */
export class ClaudeAuthError extends Error {
  constructor(message = "Not signed in — update your session key.") {
    super(message);
    this.name = "ClaudeAuthError";
  }
}

/** Any other failure talking to claude.ai (network, blocked, bad response). */
export class ClaudeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeError";
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Parses one usage window (`{ utilization, resets_at }`) into a Metric.
 * Returns null for a missing/null window or an unusable utilization value.
 */
export function parseMetric(value: unknown): Metric | null {
  if (value == null || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const raw = obj.utilization;
  const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(num)) return null;

  const resetsAt = typeof obj.resets_at === "string" ? obj.resets_at : null;
  return { percent: clampPercent(num), resetsAt };
}

// Preferred display order for the per-model weekly rows (by lowercased label);
// unknown models sort after these, alphabetically.
const MODEL_ORDER = ["opus", "sonnet", "haiku", "fable"];

const MODEL_LABELS: Record<string, string> = {
  opus: "Opus",
  sonnet: "Sonnet",
  haiku: "Haiku",
  fable: "Fable",
};

function modelLabel(slug: string): string {
  return MODEL_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " ");
}

function sortModels(models: ModelUsage[]): ModelUsage[] {
  return [...models].sort((a, b) => {
    const ai = MODEL_ORDER.indexOf(a.label.toLowerCase());
    const bi = MODEL_ORDER.indexOf(b.label.toLowerCase());
    const ar = ai === -1 ? MODEL_ORDER.length : ai;
    const br = bi === -1 ? MODEL_ORDER.length : bi;
    return ar - br || a.label.localeCompare(b.label);
  });
}

/** Parses a `limits[]` entry (uses `percent`, not `utilization`). */
function parseLimit(value: unknown): Metric | null {
  if (value == null || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const raw = obj.percent;
  const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(num)) return null;
  const resetsAt = typeof obj.resets_at === "string" ? obj.resets_at : null;
  return { percent: clampPercent(num), resetsAt };
}

/** Reads scope.model.display_name from a `weekly_scoped` limit. */
function scopedModelLabel(value: Record<string, unknown>): string {
  const scope = value.scope as Record<string, unknown> | undefined;
  const model = scope?.model as Record<string, unknown> | undefined;
  const name = model?.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : "Model";
}

/**
 * Maps the `/usage` JSON onto Jiji's windows. The canonical source is the
 * `limits[]` array (kinds `session`, `weekly_all`, `weekly_scoped` — the last
 * carrying a per-model `scope.model.display_name` such as "Fable"). Falls back
 * to the legacy top-level `five_hour` / `seven_day` / `seven_day_<model>` fields
 * for anything `limits[]` doesn't provide. Defensive: an unexpected shape yields
 * empty/null values rather than throwing.
 */
export function parseUsage(json: unknown): Usage {
  const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : {};

  let session: Metric | null = null;
  let weeklyAll: Metric | null = null;
  let models: ModelUsage[] = [];

  // Primary: the limits[] array.
  const limits = Array.isArray(obj.limits) ? obj.limits : [];
  for (const raw of limits) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    const metric = parseLimit(entry);
    if (!metric) continue;
    if (entry.kind === "session") session = session ?? metric;
    else if (entry.kind === "weekly_all") weeklyAll = weeklyAll ?? metric;
    else if (entry.kind === "weekly_scoped") models.push({ label: scopedModelLabel(entry), metric });
  }

  // Fallback: legacy top-level fields.
  if (!session) session = parseMetric(obj.five_hour);
  if (!weeklyAll) weeklyAll = parseMetric(obj.seven_day);
  if (models.length === 0) {
    for (const key of Object.keys(obj)) {
      const match = /^seven_day_(.+)$/.exec(key);
      if (!match) continue;
      const metric = parseMetric(obj[key]);
      if (!metric) continue;
      models.push({ label: modelLabel(match[1]), metric });
    }
  }

  models = sortModels(models);
  return { session, weeklyAll, models };
}

/**
 * Picks the organization UUID from the parsed `/api/organizations` response.
 * Takes the first org (see plan: multi-org selection is a future preference).
 * Throws ClaudeError when the list is empty or malformed.
 */
export function pickOrgId(json: unknown): string {
  if (!Array.isArray(json) || json.length === 0) {
    throw new ClaudeError("No Claude organization found for this session.");
  }
  const first = json[0] as Record<string, unknown> | null;
  const uuid = first && typeof first.uuid === "string" ? first.uuid : null;
  if (!uuid) {
    throw new ClaudeError("Could not read organization id from claude.ai.");
  }
  return uuid;
}

/** Authenticated GET returning parsed JSON, with claude.ai-specific error mapping. */
async function getJSON(url: string, sessionKey: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Cookie: `sessionKey=${sessionKey}`,
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
  } catch (e) {
    throw new ClaudeError(`Network error reaching claude.ai: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new ClaudeAuthError();
  }
  // Redirected to the login page → session is invalid.
  if (res.url.includes("/login")) {
    throw new ClaudeAuthError();
  }
  if (!res.ok) {
    throw new ClaudeError(`claude.ai returned HTTP ${res.status}.`);
  }

  const body = await res.text();
  const trimmed = body.trimStart();
  // A Cloudflare challenge or login page comes back as HTML, not JSON.
  if (trimmed.startsWith("<")) {
    throw new ClaudeError("claude.ai returned a non-JSON response (blocked or signed out).");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new ClaudeError("Could not parse claude.ai response.");
  }
}

/**
 * Fetches usage for the account behind `sessionKey`.
 * Throws ClaudeAuthError when signed out, ClaudeError on other failures.
 */
export async function fetchUsage(sessionKey: string): Promise<Usage> {
  const orgs = await getJSON(ORGS_URL, sessionKey);
  const orgId = pickOrgId(orgs);
  const raw = await getJSON(usageURL(orgId), sessionKey);
  return parseUsage(raw);
}

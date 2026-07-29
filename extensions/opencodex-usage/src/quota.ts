import { Color } from "@raycast/api";
import type { AccountQuota, PaceWindowChoice, ProviderQuotaReport, WindowChoice } from "./api";

export interface QuotaRow {
  label: string;
  percent: number;
  resetAt?: number;
}

/** Wire values mix seconds and milliseconds; normalise everything to ms. */
function toMillis(value?: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return value < 1e12 ? value * 1000 : value;
}

function windowRank(label: string): number {
  if (label === "5h") return 0;
  if (label === "Weekly") return 1;
  if (label === "First-party models") return 2;
  if (label === "API usage") return 3;
  if (label === "Monthly") return 4;
  return 5;
}

export function buildQuotaRows(quota?: AccountQuota | null): QuotaRow[] {
  if (!quota) return [];
  const rows: QuotaRow[] = [];
  if (typeof quota.fiveHourPercent === "number") {
    rows.push({ label: "5h", percent: quota.fiveHourPercent, resetAt: toMillis(quota.fiveHourResetAt) });
  }
  if (typeof quota.weeklyPercent === "number") {
    rows.push({ label: "Weekly", percent: quota.weeklyPercent, resetAt: toMillis(quota.weeklyResetAt) });
  }
  if (typeof quota.monthlyPercent === "number") {
    rows.push({ label: "Monthly", percent: quota.monthlyPercent, resetAt: toMillis(quota.monthlyResetAt) });
  }
  for (const custom of quota.customWindows ?? []) {
    // Vendor-specific windows are free-form, so both fields are checked before use.
    if (typeof custom?.percent !== "number" || typeof custom.label !== "string") continue;
    rows.push({ label: custom.label, percent: custom.percent, resetAt: toMillis(custom.resetAt) });
  }
  return rows.sort((a, b) => windowRank(a.label) - windowRank(b.label));
}

export function maxUtilisation(quota?: AccountQuota | null): number {
  const rows = buildQuotaRows(quota);
  return rows.length ? Math.max(...rows.map((row) => row.percent)) : -1;
}

/**
 * Windows whose nominal length is known, so how far through one we are can be derived
 * from the reset timestamp. Custom vendor windows have no fixed duration and are skipped.
 */
const WINDOW_DURATION_MS: Record<string, number> = {
  "5h": 5 * 60 * 60 * 1000,
  Weekly: 7 * 24 * 60 * 60 * 1000,
  Monthly: 30 * 24 * 60 * 60 * 1000,
};

export interface QuotaPace {
  /** Share of the window already elapsed, 0-100. */
  elapsedPercent: number;
  /** Used minus elapsed. Negative means consuming slower than the clock. */
  deltaPercent: number;
}

/**
 * Compares consumption against time elapsed in the window. A delta of -20 means usage is
 * 20 points below an even burn rate; +20 means it is running hot and the quota is on
 * course to run out early. Only windows with a known duration and reset time qualify.
 */
function quotaPace(row: QuotaRow, now = Date.now()): QuotaPace | undefined {
  const duration = WINDOW_DURATION_MS[row.label];
  if (!duration || !row.resetAt) return undefined;

  const remaining = row.resetAt - now;
  // Guard against stale or already-expired windows, where the ratio stops being meaningful.
  if (remaining <= 0 || remaining > duration) return undefined;

  const elapsedRatio = (duration - remaining) / duration;
  const elapsedPercent = elapsedRatio * 100;
  return {
    elapsedPercent,
    deltaPercent: row.percent - elapsedPercent,
  };
}

/**
 * Plain-language pace verdict. A signed percentage needs explaining every time, so the
 * label states the conclusion and leaves the arithmetic to the tooltip.
 */
export function paceLabel(pace: QuotaPace): string {
  const rounded = Math.round(pace.deltaPercent);
  if (rounded <= -10) return "well under pace";
  if (rounded <= -3) return "under pace";
  if (rounded < 5) return "on pace";
  if (rounded < 20) return "over pace";
  return "well over pace";
}

/** Muted by design: pace is context, not the headline number. Only trouble gets colour. */
export function paceColor(pace: QuotaPace): Color {
  return pace.deltaPercent >= 20 ? Color.Orange : Color.SecondaryText;
}

/** Full explanation for tooltips, spelling out both sides of the comparison. */
export function paceDescription(row: QuotaRow, pace: QuotaPace): string {
  const used = Math.round(row.percent);
  const elapsed = Math.round(pace.elapsedPercent);
  const rounded = Math.round(pace.deltaPercent);
  const window = row.label === "5h" ? "5h window" : `${row.label.toLowerCase()} window`;
  const span = row.label === "5h" ? "window" : row.label === "Monthly" ? "month" : "week";
  const verdict =
    rounded >= 5
      ? "At this rate the quota runs out before it resets."
      : rounded <= -3
        ? "You have room to spare at this rate."
        : "You are tracking evenly.";
  return `Used ${used}% of the ${window} with ${elapsed}% of the ${span} gone. ${verdict}`;
}

const PACE_CHOICE_LABELS: Record<Exclude<PaceWindowChoice, "off">, string> = {
  weekly: "Weekly",
  "5h": "5h",
  monthly: "Monthly",
};

/** Resolves the row the pace hint should track, honouring the `off` setting. */
export function findPaceRow(
  rows: QuotaRow[],
  choice: PaceWindowChoice,
  now = Date.now(),
): { row: QuotaRow; pace: QuotaPace } | undefined {
  if (choice === "off") return undefined;
  const row = rows.find((candidate) => candidate.label === PACE_CHOICE_LABELS[choice]);
  if (!row) return undefined;
  const pace = quotaPace(row, now);
  return pace ? { row, pace } : undefined;
}

const CHOICE_LABELS: Record<Exclude<WindowChoice, "worst">, string> = {
  weekly: "Weekly",
  "5h": "5h",
  monthly: "Monthly",
};

/**
 * Resolves the row a ring/pill should show. Falls back to the highest-usage window when the
 * preferred one is not reported by the provider, so a row never renders empty.
 */
export function selectQuotaRow(rows: QuotaRow[], choice: WindowChoice): QuotaRow | undefined {
  if (rows.length === 0) return undefined;
  if (choice !== "worst") {
    const match = rows.find((row) => row.label === CHOICE_LABELS[choice]);
    if (match) return match;
  }
  return rows.reduce((worst, row) => (row.percent > worst.percent ? row : worst), rows[0]);
}

export function usageColor(percent: number): Color {
  if (percent >= 90) return Color.Red;
  if (percent >= 70) return Color.Orange;
  if (percent >= 40) return Color.Yellow;
  return Color.Green;
}

const BAR_WIDTH = 12;

export function bar(percent: number, width = BAR_WIDTH): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function formatReset(resetAt?: number): string | undefined {
  if (!resetAt) return undefined;
  const diffMs = resetAt - Date.now();
  if (diffMs <= 0) return "resets now";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `resets in ${minutes}m`;
  const hours = Math.round(diffMs / 3600000);
  if (hours < 24) return `resets in ${hours}h`;
  const days = Math.round(diffMs / 86400000);
  return `resets in ${days}d`;
}

export function formatResetAbsolute(resetAt?: number): string | undefined {
  if (!resetAt) return undefined;
  return new Date(resetAt).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Defensive: the response guard enforces string fields, but naming must never throw. */
function trimmed(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function providerTitle(report: ProviderQuotaReport): string {
  return trimmed(report.label) ?? trimmed(report.provider) ?? "Unknown provider";
}

/** Compact display name for narrow list rows: "Anthropic Claude" -> "Claude". */
export function providerShortTitle(report: ProviderQuotaReport): string {
  const key = trimmed(report.provider)?.toLowerCase();
  return (key ? shortProviderName(key) : undefined) ?? fallbackShortName(report);
}

/** Product-facing names, matching how the vendors brand their coding surfaces. */
export function shortProviderName(provider: string): string | undefined {
  const known: Record<string, string> = {
    anthropic: "Claude",
    "anthropic-apikey": "Claude API",
    claude: "Claude",
    openai: "Codex",
    "openai-apikey": "OpenAI API",
    codex: "Codex",
    "azure-openai": "Azure",
    google: "Google",
    "google-vertex": "Vertex AI",
    gemini: "Gemini",
    xai: "xAI",
    grok: "Grok",
    kimi: "Kimi",
    "kimi-code": "Kimi",
    moonshot: "Moonshot",
    kiro: "Kiro",
    cursor: "Cursor",
    deepseek: "DeepSeek",
    mistral: "Mistral",
    qwen: "Qwen",
    "qwen-cloud": "Qwen",
    zai: "Z.ai",
    openrouter: "OpenRouter",
    groq: "Groq",
    ollama: "Ollama",
    "ollama-cloud": "Ollama",
    cerebras: "Cerebras",
    together: "Together",
    fireworks: "Fireworks",
    huggingface: "Hugging Face",
    nvidia: "NVIDIA",
    minimax: "MiniMax",
    "vercel-ai-gateway": "Vercel",
    "cloudflare-ai-gateway": "Cloudflare",
    "gitlab-duo": "GitLab Duo",
    "lm-studio": "LM Studio",
    vllm: "vLLM",
    litellm: "LiteLLM",
    kilo: "Kilo",
    replit: "Replit",
  };
  return known[provider.trim().toLowerCase()];
}

function fallbackShortName(report: ProviderQuotaReport): string {
  const label = trimmed(report.label);
  if (label) {
    // Strip parenthetical suffixes such as "OpenAI (Codex login)" and keep the first word group.
    const withoutParens = label.replace(/\s*\(.*?\)\s*/g, " ").trim();
    if (withoutParens) return withoutParens.split(/\s+/)[0];
  }
  return trimmed(report.provider) ?? "Unknown provider";
}

export function formatNumber(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatTokens(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

export function formatCost(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

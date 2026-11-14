const PROVIDER_NAMES: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  openai: "OpenAI",
  gemini: "Gemini",
  cursor: "Cursor",
  copilot: "Copilot",
  antigravity: "Antigravity",
  opencode: "OpenCode",
  opencodego: "OpenCode Go",
  openrouter: "OpenRouter",
  factory: "Droid",
  zai: "z.ai",
  minimax: "MiniMax",
  kimi: "Kimi",
  kiro: "Kiro",
  amp: "Amp",
  windsurf: "Windsurf",
  warp: "Warp",
  zed: "Zed",
  augment: "Augment",
  jetbrains: "JetBrains AI",
  vertexai: "Vertex AI",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  grok: "Grok",
  xai: "xAI",
  perplexity: "Perplexity",
  raycast: "Raycast",
  muse: "Muse",
  pi: "Pi",
};

export function providerName(id: string): string {
  return PROVIDER_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** Human title for the standard primary/secondary/tertiary windows, derived from their length. */
export function windowTitle(windowMinutes: number | undefined, fallback: string): string {
  switch (windowMinutes) {
    case 300:
      return "5-Hour Session";
    case 1440:
      return "Daily";
    case 10080:
      return "Weekly";
    case 43200:
      return "Monthly";
    default:
      return fallback;
  }
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export type PercentMode = "remaining" | "used";

export function shownPercent(usedPercent: number, mode: PercentMode): number {
  const used = clampPercent(usedPercent);
  return Math.round(mode === "used" ? used : 100 - used);
}

export function percentLabel(usedPercent: number, mode: PercentMode): string {
  return `${shownPercent(usedPercent, mode)}% ${mode === "used" ? "used" : "left"}`;
}

export type Severity = "ok" | "warning" | "critical" | "exhausted";

/** Severity is always based on what is left, regardless of how percentages are displayed. */
export function severity(usedPercent: number): Severity {
  const left = 100 - clampPercent(usedPercent);
  if (left <= 0) return "exhausted";
  if (left <= 10) return "critical";
  if (left <= 30) return "warning";
  return "ok";
}

/** Compact duration: `6d 11h`, `4h 12m`, `12m`, `<1m`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 60_000) return "<1m";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export function formatResetIn(resetsAt: Date | undefined, now: Date = new Date()): string | undefined {
  if (!resetsAt) return undefined;
  const ms = resetsAt.getTime() - now.getTime();
  if (ms <= 0) return "Resetting now";
  return `Resets in ${formatDuration(ms)}`;
}

export function formatCurrency(amount: number | undefined, currency = "USD"): string {
  if (amount === undefined || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatTokens(tokens: number | undefined): string {
  if (tokens === undefined || !Number.isFinite(tokens)) return "—";
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (tokens >= size) {
      const value = tokens / size;
      return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)}${suffix}`;
    }
  }
  return String(Math.round(tokens));
}

export function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

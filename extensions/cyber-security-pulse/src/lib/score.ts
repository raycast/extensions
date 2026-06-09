import { Severity } from "./types";

// Signal sets. Severity = the HIGHEST matched tier (never a sum). Edit these
// lists to tune classification. Matching is word-boundary aware, so short tokens
// like "rce" or "poc" do not match inside "source" / "epoch".

// Active exploitation — "act now" signals. Gated to the TITLE only: roundup
// articles ("Weekly Recap", "Patch Tuesday") mention these in the body but are
// not themselves critical.
const EXPLOIT_SIGNALS = [
  "actively exploited",
  "active exploitation",
  "exploited in the wild",
  "in the wild",
  "under active attack",
  "active attacks",
  "zero-day",
  "zero day",
  "0-day",
  "wormable",
  "exploitation observed",
  "being exploited",
  "cisa kev",
  "known exploited",
];

// Remote code execution + unauthenticated → critical when both present
// (title or body, word-boundary matched).
const RCE_SIGNALS = ["remote code execution", "rce"];
const UNAUTH_SIGNALS = [
  "unauthenticated",
  "pre-auth",
  "preauth",
  "without authentication",
  "no authentication",
];

// High tier (amber): serious, but not gated-critical.
const HIGH_SIGNALS = [
  "ransomware",
  "backdoor",
  "supply chain",
  "cvss 9",
  "cvss 10",
  "rce",
  "privilege escalation",
  "data breach",
  "exploit",
  "exploited",
  "proof of concept",
  "poc",
];

// Promotional / non-report markers. When present in the TITLE they suppress the
// Critical gate (a webinar titled "…Zero-Day…" is not an incident report).
const PROMO_SIGNALS = [
  "webinar",
  "whitepaper",
  "white paper",
  "e-book",
  "ebook",
  "register now",
  "register today",
  "sign up",
  "sponsored",
  "on-demand",
  "on demand",
  "livestream",
  "live stream",
];

// Medium tier (yellow): routine vuln / patch news.
const MEDIUM_SIGNALS = [
  "vulnerability",
  "vulnerabilities",
  "flaw",
  "flaws",
  "patch",
  "security update",
  "advisory",
  "cve-",
];

const SEVERITY_BASE: Record<Severity, number> = {
  critical: 300,
  high: 200,
  medium: 100,
  low: 0,
};

// User-supplied keywords added to each tier (from preferences).
export interface ExtraSignals {
  critical: string[];
  high: string[];
  medium: string[];
}

const NO_EXTRA: ExtraSignals = { critical: [], high: [], medium: [] };

// Parse a comma-separated keyword preference into a trimmed list.
export function parseKeywords(raw: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const cache = new Map<string, RegExp>();
function rx(signal: string): RegExp {
  let re = cache.get(signal);
  if (!re) {
    const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // A leading \b only works before a word char; keywords starting with
    // punctuation (".net", "c#") need none.
    const boundary = /^\w/.test(signal) ? "\\b" : "";
    re = new RegExp(`${boundary}${escaped}`, "i");
    cache.set(signal, re);
  }
  return re;
}

function has(text: string, signals: string[]): boolean {
  return signals.some((s) => rx(s).test(text));
}

// Word-boundary, case-insensitive keyword match. Exported for the denylist.
export function hasKeyword(text: string, keywords: string[]): boolean {
  return has(text, keywords);
}

function classify(title: string, body: string, extra: ExtraSignals): Severity {
  const full = `${title} ${body}`;
  // Promotional titles (webinars, whitepapers, …) are not incident reports, so
  // they don't take the title-gated exploit path to Critical.
  const promo = has(title, PROMO_SIGNALS);
  // Critical: exploit signal in a non-promo TITLE, a user "extra critical"
  // keyword anywhere (trusted), or an RCE + unauth combo anywhere.
  if (
    (has(title, EXPLOIT_SIGNALS) && !promo) ||
    has(full, extra.critical) ||
    (has(full, RCE_SIGNALS) && has(full, UNAUTH_SIGNALS))
  ) {
    return "critical";
  }
  if (has(full, HIGH_SIGNALS) || has(full, extra.high)) return "high";
  if (has(full, MEDIUM_SIGNALS) || has(full, extra.medium)) return "medium";
  return "low";
}

// Count distinct matched signals (title matches weighted 2x) for intra-tier
// ordering only — never escalates the tier.
function matchBonus(title: string, body: string, extra: ExtraSignals): number {
  const all = [
    ...EXPLOIT_SIGNALS,
    ...RCE_SIGNALS,
    ...UNAUTH_SIGNALS,
    ...HIGH_SIGNALS,
    ...MEDIUM_SIGNALS,
    ...extra.critical,
    ...extra.high,
    ...extra.medium,
  ];
  let bonus = 0;
  for (const s of all) {
    if (rx(s).test(title)) bonus += 2;
    else if (rx(s).test(body)) bonus += 1;
  }
  return bonus;
}

export function scoreItem(
  title: string,
  body: string,
  extra: ExtraSignals = NO_EXTRA,
): { score: number; severity: Severity } {
  const severity = classify(title, body, extra);
  const score = SEVERITY_BASE[severity] + matchBonus(title, body, extra);
  return { score, severity };
}

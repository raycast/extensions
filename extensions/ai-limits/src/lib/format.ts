import type { Balance, ProviderErrorCode, ProviderErrorKind, ProviderUsage, UsageWindow } from "./types";

// Pure display helpers for the usage view. They take the clock as `now` and never import @raycast/api, so the tests
// run without Raycast.

export type DisplayMode = "used" | "remaining";

// Semantic colors for the usage level. The view maps these to Raycast colors.
export type Level = "ok" | "warning" | "critical";

// The tone of a list tag: the usage level of the limit it shows.
export type Tone = Level;

export interface Failure {
  kind: ProviderErrorKind;
  message: string;
  hint?: string;
  // Carried from the ProviderError, so the view can act on it (see ProviderErrorCode).
  code?: ProviderErrorCode;
  // When the provider allows the next request, in epoch milliseconds. Set after a 429 (see ProviderError.retryAt).
  retryAt?: number;
}

// What the view knows about one provider. `usage` is the last successful result. It can come from the cache, while a
// refresh is running or after the refresh failed.
export interface ProviderState {
  loading: boolean;
  usage?: ProviderUsage;
  // Shown to the user. After a 429 it is set only when there is no saved usage, since saved numbers show as they are.
  failure?: Failure;
  // The 429 still cooling down, kept so refreshes wait until its retryAt. Not shown on its own, see `failure`.
  cooldown?: Failure;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const SHOW_RELATIVE_RESET_DAYS = 7;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// The window closest to its limit. Ties keep the earlier window, so the order the provider sends is respected.
export function headlineWindow(usage: ProviderUsage | undefined): UsageWindow | undefined {
  let headline: UsageWindow | undefined;
  for (const window of usage?.windows ?? []) {
    if (headline === undefined || window.usedPercent > headline.usedPercent) {
      headline = window;
    }
  }
  return headline;
}

// The percent wording for a usage number. Windows and balances with a limit both use it.
function percentText(usedPercent: number, mode: DisplayMode): string {
  const used = clampPercent(usedPercent);
  return mode === "remaining" ? `${Math.round(100 - used)}% left` : `${Math.round(used)}% used`;
}

// "62% used" or "38% left", depending on the Show Limits As preference.
export function formatPercent(window: UsageWindow, mode: DisplayMode): string {
  return percentText(window.usedPercent, mode);
}

// Green below 70% used, yellow below 90%, red from 90% on. Always based on usage, not on the display mode, so the
// color means the same thing whichever number is shown.
export function levelColor(usedPercent: number): Level {
  const used = clampPercent(usedPercent);
  if (used < 70) {
    return "ok";
  }
  return used < 90 ? "warning" : "critical";
}

const LEVEL_HEX: Record<Level, string> = { ok: "#59D499", warning: "#FFC531", critical: "#FF6363" };

// A rounded progress bar as an SVG data URI, colored by level, for the detail pane's Markdown. The empty part is a
// translucent gray, so the bar reads in both light and dark themes.
export function progressBarImage(usedPercent: number): string {
  const filled = Math.round((clampPercent(usedPercent) * 300) / 100);
  const color = LEVEL_HEX[levelColor(usedPercent)];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="8" viewBox="0 0 300 8">` +
    `<rect width="300" height="8" rx="4" fill="#8E8E93" fill-opacity="0.3"/>` +
    (filled > 0 ? `<rect width="${filled}" height="8" rx="4" fill="${color}"/>` : "") +
    `</svg>`;
  // Base64, so the characters in the SVG can't break the Markdown image link.
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

// "45m", "2h 13m", "3d 4h". Rounds minutes up, so a reset one second away reads as "1m", not "0m".
function durationText(milliseconds: number): string {
  const totalMinutes = Math.ceil(milliseconds / MINUTE_MS);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  if (milliseconds < DAY_MS) {
    return `${Math.floor(totalMinutes / 60)}h ${pad(totalMinutes % 60)}m`;
  }
  const days = Math.floor(milliseconds / DAY_MS);
  const hours = Math.floor((milliseconds - days * DAY_MS) / HOUR_MS);
  return `${days}d ${hours}h`;
}

// "resets in 45m", "resets in 2h 13m", "resets in 3d 4h". Past a week the relative time stops being useful, so it shows
// the date instead ("resets Oct 21"). "resets now" when the time has passed and the provider hasn't updated yet.
export function formatReset(resetsAt: number | null, now: number): string {
  if (resetsAt === null) {
    return "";
  }
  const remaining = resetsAt - now;
  if (remaining <= 0) {
    return "resets now";
  }
  if (remaining >= SHOW_RELATIVE_RESET_DAYS * DAY_MS) {
    const date = new Date(resetsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `resets ${date}`;
  }
  return `resets in ${durationText(remaining)}`;
}

// "$12.34", "€5.00", or "125.5 credits" for providers that count credits instead of money.
export function formatMoney(amount: number, currency: string): string {
  if (currency === "credits") {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} credits`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    // An unknown currency code makes Intl throw. Show the raw code instead of hiding the amount.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// "$40.00" for a balance. A capped balance reads "$12.34 of $50.00 used", so it isn't mistaken for money left.
export function formatBalance(balance: Balance): string {
  const amount = formatMoney(balance.amount, balance.currency);
  if (balance.limit === undefined) {
    return amount;
  }
  return `${amount} of ${formatMoney(balance.limit, balance.currency)} used`;
}

// "$40.00 · resets in 3d 4h" for a balance that resets, so the reset sits beside the amount. The reset is left out when the
// balance doesn't say when it resets.
function balanceText(balance: Balance, now: number): string {
  const reset = formatReset(balance.resetsAt ?? null, now);
  return reset ? `${formatBalance(balance)} · ${reset}` : formatBalance(balance);
}

// "just now", "2 min ago", "3 h ago", "2 d ago". A time in the future (clock changes) also reads as "just now".
export function formatUpdated(fetchedAt: number, now: number): string {
  const elapsed = now - fetchedAt;
  if (elapsed < MINUTE_MS) {
    return "just now";
  }
  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  }
  if (elapsed < DAY_MS) {
    return `${Math.floor(elapsed / HOUR_MS)} h ago`;
  }
  return `${Math.floor(elapsed / DAY_MS)} d ago`;
}

export function failureTitle(failure: Failure): string {
  switch (failure.kind) {
    case "not-connected":
      return "Not connected";
    case "auth":
      return "Sign in needed";
    default:
      return "Error";
  }
}

// Hints are written as steps. A hint with several lines becomes a numbered list. A one-line hint with several sentences
// is split at the sentence ends, so "Run `codex login`. Then reopen this list." also reads as two steps.
export function hintSteps(hint: string): string[] {
  const lines = hint
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length > 1) {
    return lines;
  }
  return (lines[0] ?? "").split(/(?<=[.!?])\s+(?=[A-Z`])/);
}

export interface ListSummary {
  // Tooltip for a red warning icon, shown when the last refresh failed: "<failureTitle>: <message>".
  warning?: string;
  // The colored badge on the row, such as "62% used".
  tag?: { text: string; tone: Tone };
  // Plain text after the tag: the reset time, or the balance. Compact rows leave it out.
  text?: string;
}

// The accessories for one list row. The headline window gives the tag, and the reset time too unless the row is
// compact. Without windows, the first balance is shown instead. A failure adds a warning icon but keeps the saved
// numbers.
export function listSummary(
  state: ProviderState,
  mode: DisplayMode,
  now: number,
  options: { compact: boolean },
): ListSummary {
  const { usage, failure } = state;
  if (state.loading && usage === undefined) {
    return { text: "Loading…" };
  }
  if (failure?.kind === "not-connected" && usage === undefined) {
    return {};
  }

  const summary: ListSummary = {};
  const headline = headlineWindow(usage);
  const balance = usage?.balances[0];
  if (headline) {
    summary.tag = { text: formatPercent(headline, mode), tone: levelColor(headline.usedPercent) };
    if (!options.compact) {
      const reset = formatReset(headline.resetsAt, now);
      if (reset) {
        summary.text = reset;
      }
    }
  } else if (balance) {
    if (balance.limit !== undefined && balance.limit > 0) {
      const usedPercent = (balance.amount / balance.limit) * 100;
      summary.tag = { text: percentText(usedPercent, mode), tone: levelColor(usedPercent) };
      if (!options.compact) {
        summary.text = formatBalance(balance);
      }
    } else {
      summary.text = formatBalance(balance);
    }
  }

  if (failure) {
    summary.warning = `${failureTitle(failure)}: ${failure.message}`;
    // With no saved numbers, the row would be empty, so it shows the failure title. A compact row only has the icon.
    if (!summary.tag && !summary.text && !options.compact) {
      summary.text = failureTitle(failure);
    }
  }
  return summary;
}

function hintMarkdown(hint: string): string {
  const steps = hintSteps(hint);
  if (steps.length <= 1) {
    return steps[0] ?? "";
  }
  return steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

// The detail pane: one block per window, then balances and notes, or the error with its steps. Data kept from the cache
// is labelled as such when the refresh failed.
export function detailMarkdown(name: string, state: ProviderState, mode: DisplayMode, now: number): string {
  const blocks: string[] = [`## ${name}`];
  const { usage, failure } = state;

  if (usage) {
    for (const window of usage.windows) {
      const percent = formatPercent(window, mode);
      const reset = formatReset(window.resetsAt, now);
      const lines = [
        `**${window.label}**`,
        "",
        `![${percent}](${progressBarImage(window.usedPercent)})`,
        "",
        reset ? `${percent} · ${reset}` : percent,
      ];
      if (window.detail) {
        lines.push("", window.detail);
      }
      blocks.push(lines.join("\n"));
    }
    for (const balance of usage.balances) {
      if (balance.limit !== undefined && balance.limit > 0) {
        const usedPercent = (balance.amount / balance.limit) * 100;
        const bar = `![${percentText(usedPercent, mode)}](${progressBarImage(usedPercent)})`;
        blocks.push([`**${balance.label}**`, "", bar, "", balanceText(balance, now)].join("\n"));
      } else {
        blocks.push([`**${balance.label}**`, "", balanceText(balance, now)].join("\n"));
      }
    }
    if (usage.windows.length === 0 && usage.balances.length === 0) {
      blocks.push("No limits reported for this account.");
    }
    if (usage.notes.length > 0) {
      blocks.push(usage.notes.map((note) => `- ${note}`).join("\n"));
    }
  } else if (state.loading) {
    blocks.push("Loading…");
  }

  if (failure) {
    const lines = [`**${failureTitle(failure)}**`, "", failure.message];
    if (failure.hint) {
      lines.push("", hintMarkdown(failure.hint));
    }
    blocks.push(lines.join("\n"));
    if (usage) {
      blocks.push("_Showing saved data. The last refresh failed._");
    }
  }
  return blocks.join("\n\n");
}

// Plain text for Copy Usage, one line per window or balance.
export function summaryText(name: string, state: ProviderState, mode: DisplayMode, now: number): string {
  const { usage, failure } = state;
  const lines: string[] = [];
  if (usage) {
    lines.push(usage.plan ? `${name} (${usage.plan})` : name);
    for (const window of usage.windows) {
      const reset = formatReset(window.resetsAt, now);
      lines.push(`${window.label}: ${formatPercent(window, mode)}${reset ? `, ${reset}` : ""}`);
    }
    for (const balance of usage.balances) {
      const reset = formatReset(balance.resetsAt ?? null, now);
      lines.push(`${balance.label}: ${formatBalance(balance)}${reset ? `, ${reset}` : ""}`);
    }
    lines.push(`Updated ${formatUpdated(usage.fetchedAt, now)}`);
  } else {
    lines.push(name);
  }
  if (failure) {
    lines.push(`${failureTitle(failure)}: ${failure.message}`);
  }
  return lines.join("\n");
}

/**
 * Every string the command shows, and the markdown built from them (spec 0143, S-10: a store product's UI is public,
 * so these are statements, each here once). The shell in `shorten-clipboard-url.tsx` only places them.
 *
 * Text the API sent is never trusted as markdown: it is cut to 500 characters and escaped, so it can't become an
 * image, a link or HTML. The Retry-After wording follows `mcp/src/api.ts` (`rateLimitHint`); the next steps N-1 to
 * N-7 name no plan, price or limit (Decision 5): the API's own text carries those.
 */
import QRCode from "qrcode";
import type { FailureKind, ShortenResult } from "./api";

/** The failure titles of AC-4 and AC-5; `api.ts` puts one on each failure it returns. */
export const TITLES = {
  quotaAnonymous: "Limit reached for links without an account",
  quotaAccount: "Limit reached for your plan's links",
  rateLimited: "Too many requests",
  blocked: "Linkonda refused this destination",
  invalidUrl: "Linkonda couldn't use this URL",
  key: "API key not accepted",
  keyCannotCreate: "This API key can't make links",
  unavailable: "Linkonda couldn't shorten the link right now",
  other: "Linkonda couldn't shorten the link",
  network: "Couldn't reach Linkonda",
  unexpected: "Linkonda returned an unexpected response",
} as const;

export const LOADING = "Shortening the URL on your clipboard…";

export const NO_URL_TITLE = "No URL on the clipboard";
export const NO_URL_BODY =
  "Copy a web address that starts with http:// or https://, then run Shorten Clipboard URL again.";
export const NOTHING_SENT = "Nothing was sent to Linkonda.";
export const CREDENTIALS_TITLE = "This URL contains a username or password";
export const CREDENTIALS_BODY =
  "This extension doesn't send a URL that carries sign-in details. Copy the address without them.";

export const COPIED_TOAST = "Short link copied";
/** When the copy fails the clipboard still holds the long URL, so the user must not paste it believing it short. */
export const COPY_FAILED_TOAST = "Couldn't copy the short link";
export const LABEL_SHORT_LINK = "Short link";
export const LABEL_DESTINATION = "Destination";
export const LABEL_EXPIRY = "Expiry";
export const LABEL_ACCOUNT = "Account";
export const EXPIRY_NEVER = "Never";
export const ACCOUNT_SAVED = "Saved to your account";
export const ACCOUNT_NOT_SAVED = "Not saved to an account";
export const QR_FAILED = "The short link is on your clipboard. The QR code couldn't be made.";
export const QR_ALT = "QR code of the short link";

export const ACTION_COPY = "Copy Short Link";
export const ACTION_OPEN = "Open Short Link";
export const ACTION_RETRY = "Try Again";
export const ACTION_PREFERENCES = "Open Extension Preferences";

export const N1 =
  "Links without an account are limited per network. A slot frees up when one of this network's links expires. To save links to an account instead, add an API key in the extension's preferences (API keys need a paid plan; create one at https://linkonda.com/api-keys).";
export const N2 =
  "Paused, expired and deleted links don't count toward your plan's limit. Pause or delete links you no longer need on https://linkonda.com, or move to a plan with a higher limit.";
export const N3 = "Trying the same URL again gives the same answer.";
export const N4 =
  "Create a new key at https://linkonda.com/api-keys and paste it into the extension's preferences, or clear the API key in the extension's preferences to shorten without an account.";
export const N5 =
  "See your keys at https://linkonda.com/api-keys, or clear the API key in the extension's preferences to shorten without an account.";
export const N6 = "Try again in a moment.";
export const N7 = "Check your connection and try again.";

/** What reaches the screen from the API's `error`. */
const MESSAGE_LIMIT = 500;

/** Backslash, backtick and the characters that start an image, link, HTML, heading, emphasis or table in markdown. */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]()<>!#|]/g, "\\$&");
}

const cut = (text: string, limit: number): string => [...text].slice(0, limit).join("");

/** As `rateLimitHint` in `mcp/src/api.ts`: integer seconds only; the daily allowance's header runs to 00:00 UTC. */
export function retryAfterText(header: string | null | undefined): string {
  if (header == null || !/^\d+$/.test(header)) return N6;
  const s = Number(header);
  if (s <= 90) return `Try again in ${s} ${s === 1 ? "second" : "seconds"}.`;
  if (s <= 5400) return `Try again in about ${Math.ceil(s / 60)} minutes.`;
  return `Try again in about ${Math.ceil(s / 3600)} hours.`;
}

/** `timeZone` is for tests; the command shows the date in the user's own zone. */
export function formatExpiry(expiresAt: string | null, timeZone?: string): string {
  if (expiresAt === null) return EXPIRY_NEVER;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone });
}

export function noUrlMarkdown(reason: "none" | "credentials"): string {
  return reason === "credentials"
    ? `## ${CREDENTIALS_TITLE}\n\n${CREDENTIALS_BODY} ${NOTHING_SENT}`
    : `## ${NO_URL_TITLE}\n\n${NO_URL_BODY}\n\n${NOTHING_SENT}`;
}

type Failure = Extract<ShortenResult, { ok: false }>;

/** The next step for a failure, or undefined when there is none. */
export function nextStep(failure: Failure): string | undefined {
  const byKind: Record<FailureKind, string | undefined> = {
    quota: failure.anonymous === false ? N2 : N1,
    "rate-limited": retryAfterText(failure.retryAfter),
    blocked: N3,
    "invalid-url": undefined,
    key: failure.code === "INVALID_API_KEY" || failure.code === "API_KEY_REVOKED" ? N4 : N5,
    unavailable: N6,
    other: undefined,
    network: N7,
    unexpected: N6,
  };
  return byKind[failure.kind];
}

export function failureMarkdown(failure: Failure): string {
  const parts = [`## ${failure.title}`];
  if (failure.status !== undefined && failure.kind !== "unexpected" && failure.kind !== "network") {
    parts.push(failure.message ? escapeMarkdown(cut(failure.message, MESSAGE_LIMIT)) : `HTTP ${failure.status}`);
  }
  const next = nextStep(failure);
  if (next !== undefined) parts.push(next);
  // The code is the API's text too: only a plain upper-case code is shown, so it can't carry markup.
  const code = failure.code !== undefined && /^[A-Z0-9_]{1,64}$/.test(failure.code) ? failure.code : undefined;
  if (code !== undefined && failure.status !== undefined)
    parts.push(`Error code: \`${code}\` · HTTP \`${failure.status}\``);
  else if (failure.status !== undefined && failure.message) parts.push(`HTTP \`${failure.status}\``);
  return parts.join("\n\n");
}

/** The QR code as a data URL, or the text that stands in for it. */
export function successMarkdown(qrDataUrl: string | null, copied = true): string {
  // QR_FAILED says the link is on the clipboard: when the copy failed too, that sentence would be untrue.
  if (qrDataUrl === null) return copied ? QR_FAILED : "";
  return `![${QR_ALT}](${qrDataUrl}?raycast-width=256&raycast-height=256)`;
}

/** Made in this process: no image service, so the short link is shown to nobody else. `null` if it fails. */
export async function renderQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { width: 512, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  } catch {
    return null;
  }
}

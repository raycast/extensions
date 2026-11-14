// Formatting helpers for the search UI. Pure functions only — no Raycast imports here
// so they stay easy to unit test.

const MISSING = "—";

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Renders a value with `sigDigits` significant digits as a plain (non-exponential)
 * decimal string. Used for sub-$1 prices, where `toFixed`/compact notation would
 * either round to "$0.00" or fall back to scientific notation.
 */
function toPlainSignificant(value: number, sigDigits: number): string {
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(value));
  const decimals = Math.max(0, sigDigits - 1 - exponent);
  return value.toFixed(Math.min(decimals, 100));
}

/**
 * Formats a USD amount for display. Uses compact notation for large values
 * (e.g. "$42.1M", "$4.7B", "$310K") and full precision (3 significant digits) for
 * sub-$1 prices (e.g. "$0.0000112"), since compact/2-decimal notation would round
 * those to "$0.00"; 4+ leading zeros use subscript notation ("$0.0₅4755").
 * Returns "—" for undefined or NaN.
 */
export function formatUsd(n?: number): string {
  if (n === undefined || Number.isNaN(n)) return MISSING;
  if (n === 0) return "$0.00";

  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1000) {
    return compactUsdFormatter.format(n);
  }
  if (abs >= 1) {
    return `${sign}$${abs.toFixed(2)}`;
  }
  return `${sign}$${formatSmall(abs)}`;
}

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
/** Prices with at least this many zeros after the decimal point use subscript notation. */
const SUBSCRIPT_MIN_ZEROS = 4;

/**
 * Sub-$1 value, matching Defined.fi: "0.0123", or "0.0₅4755" for 0.000004755
 * (the subscript counts the zeros after the decimal point).
 */
function formatSmall(abs: number): string {
  let zeros = -Math.floor(Math.log10(abs)) - 1;
  if (zeros < SUBSCRIPT_MIN_ZEROS) return toPlainSignificant(abs, 3);
  let digits = Math.round(abs * 10 ** (zeros + 4)).toString();
  if (digits.length > 4) {
    // Rounding carried into a new digit, e.g. 0.0000099999 → 0.0₅1.
    zeros -= 1;
    digits = digits.slice(0, 4);
  }
  const subscript = [...String(zeros)].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join("");
  return `0.0${subscript}${digits.replace(/0+$/, "") || "0"}`;
}

/**
 * Formats a fractional 24h change (0.04 means +4 %) as a signed percentage string,
 * e.g. "+4.0%" or "-8.2%". Returns "—" for undefined or NaN.
 */
/** True when a change rounds to 0.0% and should be shown without color. */
export function isFlatChange(fraction: number): boolean {
  return Math.abs(fraction * 100) < 0.05;
}

export function formatPercent(fraction?: number): string {
  if (fraction === undefined || Number.isNaN(fraction)) return MISSING;
  const pct = fraction * 100;
  // Changes that round to zero get no sign, so they never read as "-0.0%".
  if (Math.abs(pct) < 0.05) return "0.0%";
  const sign = pct < 0 ? "-" : "+";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

/**
 * Formats a contract address for display, e.g. "0x6982…1933". Short strings are
 * returned unchanged. Returns "—" for an empty/undefined address.
 */
export function formatAddress(a?: string): string {
  if (!a) return MISSING;
  if (a.length <= 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Title and subtitle for a token row. Codex can return a token with no name
 * or symbol, so fall back to the name, then to the shortened address.
 */
export function tokenLabels(token: { name: string; symbol: string; address: string }): {
  title: string;
  subtitle: string;
} {
  if (token.symbol) return { title: token.symbol, subtitle: token.name };
  if (token.name) return { title: token.name, subtitle: formatAddress(token.address) };
  return { title: formatAddress(token.address), subtitle: "" };
}

/** Escapes characters that Markdown would treat as formatting in token names. */
function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]<>#|~])/g, "\\$1");
}

/**
 * An https image URL that stays inside one Markdown image destination, sized
 * through Raycast's raycast-width/height parameters; undefined otherwise. The
 * URL comes from the API, so a ")" or newline must not end the image early.
 */
function markdownImageUrl(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:") return undefined;
  url.searchParams.set("raycast-width", "56");
  url.searchParams.set("raycast-height", "56");
  // URL parsing drops newlines and encodes spaces; parentheses need encoding by hand.
  return url.href.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

/**
 * Header for the detail pane: logo, name, symbol, network, and short address.
 */
export function tokenHeaderMarkdown(token: {
  name: string;
  symbol: string;
  networkName: string;
  address: string;
  imageUrl?: string;
}): string {
  const lines: string[] = [];
  const imageUrl = token.imageUrl && markdownImageUrl(token.imageUrl);
  if (imageUrl) lines.push(`![](${imageUrl})`, "");
  lines.push(`## ${escapeMarkdown(token.name || token.symbol || formatAddress(token.address))}`, "");
  lines.push(
    `${token.symbol ? `**${escapeMarkdown(token.symbol)}** on` : "On"} ${escapeMarkdown(token.networkName)} · \`${formatAddress(token.address)}\``,
  );
  return lines.join("\n");
}

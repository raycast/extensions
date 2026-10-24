// ── Time helpers ─────────────────────────────────────────────────────────────

export function relativeAge(unixTime: number): string {
  const now = Date.now() / 1000;
  const diff = now - unixTime;

  if (diff < 0) return "in the future";
  if (diff < 60) return `${Math.floor(diff)} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

export function formatDate(unixTime: number): string {
  return new Date(unixTime * 1000).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "long",
  });
}

// ── Satoshi / BTC / USD conversion ──────────────────────────────────────────

export const SATS_PER_BTC = 100_000_000;

export function satsToBtc(sats: number): number {
  return sats / SATS_PER_BTC;
}

export function btcToSats(btc: number): number {
  return Math.round(btc * SATS_PER_BTC);
}

export function satsToUsd(sats: number, btcPriceUsd: number): number {
  return (sats / SATS_PER_BTC) * btcPriceUsd;
}

export function usdToSats(usdAmount: number, btcPriceUsd: number): number {
  return Math.round((usdAmount / btcPriceUsd) * SATS_PER_BTC);
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatSats(sats: number): string {
  if (sats >= SATS_PER_BTC) {
    return `${(sats / SATS_PER_BTC).toLocaleString(undefined, { maximumFractionDigits: 8 })} BTC`;
  }
  return `${sats.toLocaleString()} sats`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

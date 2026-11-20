import { Image } from "@raycast/api";

/** FirmLedger brand palette (taken from firmledger.co.ke). */
export const BRAND = { navy: "#0B1220", blue: "#2748D8", green: "#2F7D55", amber: "#B7791F", track: "#D5D9E0" };

export const SITE = "https://firmledger.co.ke";
export const LINKS = {
  help: `${SITE}/help`,
  terms: `${SITE}/terms`,
  privacy: `${SITE}/privacy`,
  setup: `${SITE}/docs/mcp`,
  pricing: `${SITE}/pricing`,
  apiKeys: `${SITE}/dashboard/api`,
  support: "mailto:support@firmledger.co.ke",
};

/** Confidence ring like the site's "Recent verifications" list (blue < 75, green ≥ 75, amber < 50). */
export function ring(score?: number | string): Image.ImageLike {
  const n = Math.max(0, Math.min(100, Number(score)));
  if (!Number.isFinite(n)) return { source: "extension-icon.png" };
  const color = n >= 75 ? BRAND.green : n < 50 ? BRAND.amber : BRAND.blue;
  const c = 2 * Math.PI * 14;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">` +
    `<circle cx="18" cy="18" r="14" fill="none" stroke="${BRAND.track}" stroke-width="4"/>` +
    `<circle cx="18" cy="18" r="14" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" ` +
    `stroke-dasharray="${((n / 100) * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 18 18)"/></svg>`;
  return { source: `data:image/svg+xml,${encodeURIComponent(svg)}` };
}

export function fmtDate(v: unknown): string | undefined {
  if (!v) return undefined;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Shared layout helpers so every screen reads like the firmledger.co.ke site. */
export const eyebrow = (label: string) => `\`LEDGER · ${label.toUpperCase()}\``;

export const rule = "\n\n---\n\n";

/** Markdown table from header + rows (cells are escaped for pipes/newlines). */
export function table(head: string[], rows: string[][]): string {
  const esc = (v: string) => (v ?? "—").replace(/\|/g, "\\|").replace(/\n+/g, " ") || "—";
  return [
    `| ${head.map(esc).join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`),
  ].join("\n");
}

/** Page shell: eyebrow, H1, optional lede paragraph, then body. */
export function page(label: string, title: string, lede: string | undefined, body: string): string {
  return `${eyebrow(label)}\n\n# ${title}\n${lede ? `\n${lede}\n` : ""}${body ? `\n${body}\n` : ""}`;
}

/** Section heading used in every list: LEDGER · NAME. */
export const sectionLabel = (s: string) => `LEDGER · ${s.toUpperCase()}`;

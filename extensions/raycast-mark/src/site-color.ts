/**
 * Stable placeholder colors by registered domain (ported from goose-mark).
 */

export interface SiteColor {
  bg: string;
  fg: string;
}

const SITE_PALETTE: SiteColor[] = [
  { bg: "#FBE4DB", fg: "#A0492A" },
  { bg: "#F8EAD3", fg: "#85590B" },
  { bg: "#F3F0CE", fg: "#6E6512" },
  { bg: "#E2EFD8", fg: "#4A722F" },
  { bg: "#DAEEE2", fg: "#2F6B4F" },
  { bg: "#D8ECEA", fg: "#2A6B66" },
  { bg: "#DCEBF6", fg: "#2F5F8A" },
  { bg: "#E2E4F5", fg: "#4A5490" },
  { bg: "#EAE4F5", fg: "#6B4E9C" },
  { bg: "#F5E4EF", fg: "#94476F" },
  { bg: "#F7E3E4", fg: "#9C4048" },
  { bg: "#EAE4DB", fg: "#6E5B40" },
];

const hashSeed = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return h;
};

export function siteColorOf(seed: string): SiteColor {
  return SITE_PALETTE[hashSeed(seed || "?") % SITE_PALETTE.length];
}

export function siteFgForBg(bg: string | undefined): string | null {
  if (!bg) return null;
  const hit = SITE_PALETTE.find((c) => c.bg.toLowerCase() === bg.toLowerCase());
  return hit ? hit.fg : null;
}

const MULTI_PART_SUFFIXES = new Set([
  "com.cn",
  "net.cn",
  "org.cn",
  "gov.cn",
  "edu.cn",
  "ac.cn",
  "bj.cn",
  "sh.cn",
  "com.tw",
  "org.tw",
  "com.hk",
  "org.hk",
  "com.mo",
  "co.jp",
  "or.jp",
  "ne.jp",
  "ac.jp",
  "go.jp",
  "co.kr",
  "or.kr",
  "com.sg",
  "com.my",
  "com.au",
  "net.au",
  "co.nz",
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.br",
  "com.mx",
  "co.in",
  "com.tr",
  "com.vn",
  "co.th",
  "com.ph",
  "co.id",
]);

export function registeredDomainOf(host: string): string {
  const h = (host || "").trim().toLowerCase().replace(/\.$/, "");
  if (!h) return host;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h === "localhost") return h;
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const last2 = parts.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(last2) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return last2;
}

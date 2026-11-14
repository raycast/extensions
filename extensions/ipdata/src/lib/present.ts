// Presentation helpers shared by the commands, ported from the Chrome extension's render.js:
// operator / owner derivation, threat chips, verdicts and small formatters.
import { Color } from "@raycast/api";
import { trustBand } from "./analysis";
import { IpRecord, localTime, RateInfo, Threat } from "./ipdata";

const TYPE_LABEL: Record<string, string> = {
  isp: "ISP",
  hosting: "Hosting",
  cdn: "CDN",
  edu: "Education",
  gov: "Government",
  mil: "Military",
  business: "Business",
};
export const typeLabel = (t: string | null | undefined): string =>
  t ? TYPE_LABEL[String(t).toLowerCase()] || String(t) : "";

export type Severity = "bad" | "warn";
export interface ThreatFlag {
  key: keyof Threat;
  label: string;
  severity: Severity;
}
const FLAGS: ThreatFlag[] = [
  { key: "is_known_attacker", label: "Known attacker", severity: "bad" },
  { key: "is_known_abuser", label: "Known abuser", severity: "bad" },
  { key: "is_tor", label: "Tor", severity: "bad" },
  { key: "is_vpn", label: "VPN", severity: "bad" },
  { key: "is_proxy", label: "Proxy", severity: "bad" },
  { key: "is_anonymous", label: "Anonymous", severity: "bad" },
  { key: "is_datacenter", label: "Datacenter", severity: "warn" },
  { key: "is_icloud_relay", label: "iCloud Relay", severity: "warn" },
  { key: "is_bogon", label: "Bogon", severity: "warn" },
];
export const activeFlags = (threat: Threat | null | undefined): ThreatFlag[] =>
  FLAGS.filter((f) => !!threat && threat[f.key] === true);

// One set of thresholds everywhere (Analysis, Scores, menu bar): above 80 low, above 50 moderate.
export const riskLabel = (score: number): string => {
  const band = trustBand(score) ?? "high risk";
  return band[0].toUpperCase() + band.slice(1);
};
export const riskColor = (score: number): Color => {
  const band = trustBand(score);
  return band === "low risk" ? Color.Green : band === "moderate risk" ? Color.Orange : Color.Red;
};

// One-phrase verdict, following the rules ipdata.co uses for its badges.
export function verdict(threat: Threat): string {
  const s = threat.scores ?? {};
  const named = activeFlags(threat).filter((f) => f.key !== "is_anonymous");
  if (named.length)
    return named
      .slice(0, 2)
      .map((f) => f.label)
      .join(", ");
  const v = s.vpn_score;
  const p = s.proxy_score;
  if (typeof v === "number" && typeof p === "number") {
    if (v >= 90 || p >= 90 || threat.is_anonymous) return "Anonymous";
    if (v >= 50 || p >= 50) return "Possibly anonymous";
    if (v <= 10 && p <= 10) return "Real end-user";
  }
  if (threat.is_anonymous) return "Anonymous";
  return "No threat signals";
}

// Registry placeholders such as "Provider Lir" are not a useful owner.
export function placeholderCompany(name: string | null | undefined): boolean {
  if (!name) return true;
  const n = String(name).trim();
  if (/^(unknown|n\/?a|none|private|placeholder|-)$/i.test(n)) return true;
  if (n.length < 24 && /\b(lir|provider lir|ripe ncc|arin|apnic|lacnic|afrinic|iana)\b/i.test(n)) return true;
  return false;
}

export interface Operator {
  asn: string | null; // "AS15169"
  name: string | null; // "Google LLC"
  type: string; // "ISP", "" when unknown
  domain: string | null;
  route: string | null;
}
export function operatorOf(m: IpRecord): Operator {
  return {
    asn: m.asn?.asn || null,
    name: m.asn?.name ?? m.org ?? null,
    type: typeLabel(m.asn?.type),
    domain: m.asn?.domain ?? null,
    route: m.asn?.route ?? null,
  };
}

export interface Owner {
  name: string | null;
  domain: string | null;
  network: string | null;
  type: string;
  fromCompany: boolean;
}
// The company record is the owner; without one (free tier, or a registry placeholder such as
// "Provider Lir") the operator's organization stands in, with its domain and route.
export function ownerOf(m: IpRecord): Owner {
  const c = m.company;
  if (c && !placeholderCompany(c.name)) {
    return {
      name: c.name ?? null,
      domain: c.domain ?? null,
      network: c.network ?? null,
      type: typeLabel(c.type),
      fromCompany: true,
    };
  }
  return {
    name: m.asn?.name ?? m.org ?? null,
    domain: m.asn?.domain ?? null,
    network: m.asn?.route ?? null,
    type: "",
    fromCompany: false,
  };
}

// "Frankfurt am Main" and "Hesse, Germany · 60313", as the hero shows them.
export function placeOf(m: IpRecord): { headline: string; line: string; short: string } {
  const headline = m.city || m.region || m.country_name || "Unknown location";
  const parts: string[] = [];
  if (m.city && m.region && m.region !== m.city) parts.push(m.region);
  if (m.country_name && headline !== m.country_name) parts.push(m.country_name);
  let line = parts.join(", ");
  if (m.postal) line += (line ? " · " : "") + m.postal;
  if (!line && m.continent) line = m.continent;
  const short = [m.city, m.country_name].filter(Boolean).join(", ") || headline;
  return { headline, line, short };
}

export function operatorLine(m: IpRecord): string {
  const op = operatorOf(m);
  return [op.asn, op.name].filter(Boolean).join(" ") || "Unknown operator";
}

export const coordsText = (m: IpRecord): string | null =>
  m.latitude != null && m.longitude != null ? `${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}` : null;

export function appleMapsUrl(m: IpRecord): string | null {
  if (m.latitude == null || m.longitude == null) return null;
  const q = encodeURIComponent(placeOf(m).short);
  return `maps://?ll=${m.latitude},${m.longitude}&q=${q}`;
}
export function googleMapsUrl(m: IpRecord): string | null {
  if (m.latitude == null || m.longitude == null) return null;
  return `https://www.google.com/maps?q=${m.latitude},${m.longitude}`;
}

export const ipdataUrl = (ip: string): string => `https://ipdata.co/${encodeURIComponent(ip)}`;

export function resetIn(rate: RateInfo | null | undefined): string {
  if (!rate || !rate.reset_at) return "";
  const ms = rate.reset_at - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function quotaText(rate: RateInfo | null | undefined): string | null {
  if (!rate || rate.remaining == null) return null;
  const reset = resetIn(rate);
  return (
    `${rate.remaining.toLocaleString("en-US")} of ${rate.limit.toLocaleString("en-US")}` +
    (reset ? ` · resets in ${reset}` : "")
  );
}

export function currencyText(m: IpRecord): string | null {
  const c = m.currency;
  if (!c || !c.code) return null;
  return `${c.code}${c.symbol ? " " + c.symbol : ""}${c.name ? " · " + c.name : ""}`;
}

export function languagesText(m: IpRecord): string | null {
  if (!m.languages || !m.languages.length) return null;
  return (
    m.languages
      .map((l) => l.name || l.code)
      .filter(Boolean)
      .slice(0, 4)
      .join(", ") || null
  );
}

export function carrierText(m: IpRecord): string | null {
  if (!m.carrier) return null;
  return m.carrier.name + (m.carrier.mcc ? ` (MCC ${m.carrier.mcc}, MNC ${m.carrier.mnc ?? "?"})` : "");
}

// The address's local time now (computed when shown, never cached) and its time zone.
export function localTimeText(m: IpRecord): string | null {
  if (!m.time_zone) return null;
  return [localTime(m.time_zone.name), m.time_zone.name].filter(Boolean).join(" · ") || null;
}

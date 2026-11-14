// A plain-language reading of a record: what kind of address it is, one or more analysis
// sentences, and a one-line summary. The rules are ipdata's; "first match wins" throughout.
import { LookupOk, RawRecord } from "./ipdata";

export interface Analysis {
  type: string; // badge: "Tor", "VPN", "Proxy", "Anycast", "Satellite", "Datacenter", "Likely VPN", "Likely proxy", "Real end-user", "Leased", "-"
  kind: string; // "A Tor exit", "A VPN address", … "An address"
  analysis: string; // the sentences
  summary: string; // "<kind> in <place>, on the network of <asn name> (<asn>). Used by <company>. Trust score N, low risk."
}

const flag = (raw: RawRecord, key: string): boolean => raw[key] === true;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function trustBand(trust: number | null): "low risk" | "moderate risk" | "high risk" | null {
  if (trust == null) return null;
  return trust > 80 ? "low risk" : trust > 50 ? "moderate risk" : "high risk";
}

export function analyze(result: LookupOk): Analysis {
  const raw = result.raw;
  const m = result.model;
  const threat = (m.threat ?? {}) as Record<string, unknown> & { scores?: Record<string, unknown> };
  const scores = threat.scores ?? {};
  const tor = threat.is_tor === true;
  const vpn = threat.is_vpn === true;
  const proxy = threat.is_proxy === true;
  const datacenter = threat.is_datacenter === true;
  const anycast = flag(raw, "is_anycast");
  const satellite = flag(raw, "is_satellite");
  const leased = flag(raw, "is_leased");
  const vpnScore = num(scores.vpn_score);
  const proxyScore = num(scores.proxy_score);
  const trust = num(scores.trust_score);
  const quiet = vpnScore != null && proxyScore != null && vpnScore <= 10 && proxyScore <= 10;
  const carrier = !!m.carrier;
  const lists = Array.isArray(threat.blocklists) ? threat.blocklists.length : 0;
  const band = trustBand(trust);

  // 1. Kind of address.
  let type: string;
  let kind: string;
  if (tor) [type, kind] = ["Tor", "A Tor exit"];
  else if (vpn) [type, kind] = ["VPN", "A VPN address"];
  else if (proxy) [type, kind] = ["Proxy", "A proxy address"];
  else if (anycast) [type, kind] = ["Anycast", "An anycast address"];
  else if (satellite) [type, kind] = ["Satellite", "A satellite internet address"];
  else if (datacenter) [type, kind] = ["Datacenter", "A datacenter address"];
  else if (vpnScore != null && vpnScore >= 90) [type, kind] = ["Likely VPN", "Likely a VPN address"];
  else if (proxyScore != null && proxyScore >= 90) [type, kind] = ["Likely proxy", "Likely a proxy address"];
  else if (carrier) [type, kind] = ["Real end-user", "A mobile carrier address"];
  else if (quiet) [type, kind] = ["Real end-user", "A residential or business address"];
  else if (leased) [type, kind] = ["Leased", "A leased address"];
  else [type, kind] = ["-", "An address"];

  // 3. The analysis sentence.
  const sentences: string[] = [];
  if (tor || vpn || proxy) {
    const what = tor ? "Tor" : vpn ? "VPN" : "Proxy";
    sentences.push(
      `This IP address appears to be a ${what} exit node. Its geolocation does not necessarily represent the location of the end-user.`,
    );
  } else if (anycast) {
    sentences.push(
      "This IP address is anycast, announced from many places at once. A lookup resolves to the nearest instance, so its geolocation describes that instance and not an end-user.",
    );
  } else if (satellite) {
    sentences.push(
      "This IP address belongs to a satellite internet subscriber. Its geolocation is the ground station the traffic lands at, not the subscriber.",
    );
  } else if (datacenter) {
    sentences.push(
      "This IP address belongs to a public cloud provider’s datacenter. Traffic from it is likely to be automated, and its geolocation is that of the datacenter rather than a real end-user.",
    );
  } else if (quiet) {
    sentences.push(
      "This IP address appears to belong to a real end-user. Its geolocation represents the user’s approximate location.",
    );
  } else if (carrier) {
    sentences.push(
      "This IP address appears to belong to a mobile network operator. Mobile IPs can be routed over large geographical areas, so their geolocation should not be relied on beyond the country level.",
    );
  } else if (band === "low risk") {
    sentences.push("This IP address is likely used by a real end-user and not VPN, Proxy or Datacenter services.");
  } else if (band === "moderate risk") {
    sentences.push("This IP address might be used by VPN, Proxy or Datacenter services.");
  } else {
    sentences.push("This IP address is likely used by bots, VPNs and Proxy services and not a real end-user.");
  }
  // 4. Leased, whatever the kind.
  if (leased) {
    sentences.push(
      "It is in a block that an IP broker or lessor currently rents out. Leased address space changes hands often and shows up in spam and fraud infrastructure.",
    );
  }
  // 5. Blocklists.
  if (lists) sentences.push(`It has been reported on ${lists} blocklist${lists === 1 ? "" : "s"}.`);

  // 6. Summary.
  const place = [m.city, m.region && m.region !== m.city ? m.region : null, m.country_name].filter(Boolean).join(", ");
  const asnName = m.asn?.name ?? m.org ?? null;
  let summary = kind;
  if (place) summary += ` in ${place}`;
  if (asnName) summary += `, on the network of ${asnName}${m.asn?.asn ? ` (${m.asn.asn})` : ""}`;
  summary += ".";
  const company = m.company?.name;
  if (company && company !== asnName) summary += ` Used by ${company}.`;
  if (trust != null && band) summary += ` Trust score ${trust}, ${band}.`;

  return { type, kind, analysis: sentences.join(" "), summary };
}

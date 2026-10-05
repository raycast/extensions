import { CheckReport, LayerResult, Verdict, VERDICT_META } from "./types";
import * as net from "./net";
import { verifyInternet, detectCaptive, InternetCheck } from "./anchors";
import { labelResolver, discoverUpstream } from "./resolvers";

const TEST_DOMAIN = "cloudflare.com";

export interface EnginePrefs {
  customTargets: string;
  showEgressIp: boolean;
  identifyUpstream: boolean;
}

interface CustomTarget {
  raw: string;
  kind: "url" | "hostport";
  host: string;
  port?: number;
  url?: string;
}

export function parseTargets(input: string | undefined): CustomTarget[] {
  if (!input) return [];
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw): CustomTarget => {
      if (/^https?:\/\//i.test(raw)) {
        try {
          const u = new URL(raw);
          return { raw, kind: "url", host: u.hostname, url: raw };
        } catch {
          /* fall through to host:port parsing */
        }
      }
      const m = raw.match(/^([^:/]+):(\d+)$/);
      if (m) return { raw, kind: "hostport", host: m[1], port: parseInt(m[2], 10) };
      return { raw, kind: "hostport", host: raw, port: 80 };
    });
}

async function checkCustom(t: CustomTarget): Promise<LayerResult> {
  const id = "custom:" + t.raw;
  if (t.kind === "url" && t.url) {
    const start = Date.now();
    try {
      const res = await fetch(t.url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(4000) });
      const latencyMs = Date.now() - start;
      const type = (res as { type?: string }).type;
      const ok = type === "opaqueredirect" || res.status < 500;
      return {
        id,
        label: t.raw,
        status: ok ? "ok" : "warn",
        latencyMs,
        detail: type === "opaqueredirect" ? "redirect" : `HTTP ${res.status}`,
      };
    } catch (e) {
      const err = e as { name?: string };
      return { id, label: t.raw, status: "fail", detail: err.name === "TimeoutError" ? "timeout" : "unreachable" };
    }
  }
  const port = t.port ?? 80;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { id, label: t.raw, status: "fail", detail: "invalid port" };
  }
  try {
    const r = await net.tcpProbe(t.host, port, 3000);
    return r.reachable
      ? { id, label: t.raw, status: "ok", latencyMs: r.latencyMs, detail: `tcp ${port}` }
      : { id, label: t.raw, status: "fail", detail: "unreachable" };
  } catch {
    return { id, label: t.raw, status: "fail", detail: "unreachable" };
  }
}

/**
 * Decide the "online" side of the verdict without needing a captive-portal probe.
 * Returns null when we are not clearly online, so the caller can run the captive
 * check and fall back to the offline verdicts.
 *
 * The key rule: reaching the internet over an IP-based endpoint counts as online
 * even if the confirmation count is not met, because the DNS-dependent endpoints
 * cannot pass when DNS itself is broken.
 */
export function onlineVerdict(
  confirmed: number,
  required: number,
  ipVerified: boolean,
  dnsBroken: boolean,
): Verdict | null {
  if (confirmed >= required) return dnsBroken ? "DNS_FAILING" : "ONLINE_CERTAIN";
  if (ipVerified && dnsBroken) return "DNS_FAILING";
  return null;
}

export async function runCheck(prefs: EnginePrefs): Promise<CheckReport> {
  const layers: LayerResult[] = [];
  const { gateway, iface } = await net.getDefaultGateway();

  // Connected when there is any default route. A VPN tunnel has an interface but no gateway,
  // which is still connected, so require both to be missing before giving up.
  if (!gateway && !iface) {
    layers.push({ id: "iface", label: "Network interface", status: "fail", detail: "No active connection" });
    return finalize("NO_INTERFACE", layers, prefs, "No active network connection");
  }

  const ssid = await net.getSSID(iface);
  const ifaceIsVpn = /^(utun|ppp|ipsec|tap|tun)\d/.test(iface ?? "");
  layers.push({
    id: "iface",
    label: "Interface",
    status: "ok",
    detail: ssid ? `${iface} · ${ssid}` : ifaceIsVpn ? `${iface} (VPN tunnel)` : (iface ?? "connected"),
  });

  // Run the independent probes concurrently.
  const [gwRes, dnsServers, internet, parsed, upstream, vpn, proxy] = await Promise.all([
    gateway ? net.gatewayReachable(gateway) : Promise.resolve<net.PingResult>({ ok: false }),
    net.getDnsServers(),
    verifyInternet(3000),
    Promise.resolve(parseTargets(prefs.customTargets)),
    prefs.identifyUpstream ? discoverUpstream(2500) : Promise.resolve(null),
    net.getVpnStatus(iface),
    net.getProxyStatus(),
  ]);

  if (gateway) {
    layers.push({
      id: "gateway",
      label: `Gateway ${gateway}`,
      status: gwRes.ok ? "ok" : "warn",
      latencyMs: gwRes.latencyMs,
      detail: gwRes.ok ? undefined : "no ICMP/TCP reply",
    });
  } else {
    layers.push({ id: "gateway", label: "Gateway", status: "info", detail: "via VPN tunnel (no LAN gateway)" });
  }

  // VPN and proxy change how traffic reaches the internet, so surface them when present.
  if (vpn.active) {
    layers.push({
      id: "vpn",
      label: "VPN",
      status: "info",
      detail: vpn.name ? `active · ${vpn.name}` : `active · ${vpn.via ?? "on"}`,
    });
  }
  if (proxy.enabled) {
    layers.push({ id: "proxy", label: "Proxy", status: "info", detail: proxy.summary ?? "configured" });
  }

  // DNS: real resolution against each configured server until one answers.
  let dnsOk = false;
  let dnsLatency: number | undefined;
  let dnsServerUsed: string | undefined;
  for (const server of dnsServers) {
    if (!dnsServerUsed) dnsServerUsed = server;
    const rr = await net.resolveWith(server, TEST_DOMAIN);
    if (rr.ok) {
      dnsOk = true;
      dnsLatency = rr.latencyMs;
      dnsServerUsed = server;
      break;
    }
  }
  if (dnsServers.length === 0) {
    layers.push({ id: "dns", label: "DNS", status: "warn", detail: "no resolver configured" });
  } else {
    const idLabel = dnsServerUsed ? labelResolver(dnsServerUsed) : "";
    const resStatus = dnsOk ? `resolves ${TEST_DOMAIN}` : "resolution failed";
    layers.push({
      id: "dns",
      label: `DNS ${dnsServerUsed ?? ""}`.trim(),
      status: dnsOk ? "ok" : "fail",
      latencyMs: dnsLatency,
      detail: idLabel ? `${idLabel} · ${resStatus}` : resStatus,
    });
  }

  if (upstream) {
    layers.push({
      id: "dns-upstream",
      label: "Upstream resolver",
      status: "ok",
      detail: upstream.name ? `${upstream.ip} · ${upstream.name}` : upstream.ip,
    });
  }

  // Internet checks (the confidence layer).
  for (const r of internet.results) {
    layers.push({
      id: "anchor:" + r.id,
      label: r.label,
      status: r.ok ? "ok" : "fail",
      latencyMs: r.latencyMs,
      detail: r.ok ? "TLS verified" : r.reason,
    });
  }

  // Custom targets (do not affect the verdict).
  const customResults = await Promise.all(parsed.map(checkCustom));
  layers.push(...customResults);

  // Verdict: online if a single verified HTTPS check succeeds. Only when nothing verifies
  // do we run the captive-portal probe and fall back to the offline verdicts.
  const dnsBroken = !dnsOk && !internet.hostnameVerified;
  let verdict = onlineVerdict(internet.confirmed, 1, internet.ipVerified, dnsBroken);
  if (!verdict) {
    const captive = await detectCaptive(3000);
    verdict = captive ? "CAPTIVE_PORTAL" : gwRes.ok ? "INTERNET_DOWN" : "LAN_ONLY";
  }

  return finalize(verdict, layers, prefs, reasonFor(verdict, internet), internet.egressIp);
}

function reasonFor(verdict: Verdict, internet: InternetCheck): string {
  switch (verdict) {
    case "ONLINE_CERTAIN": {
      const ok = internet.results.find((r) => r.ok);
      return ok ? `Verified HTTPS to ${ok.label}` : "Verified HTTPS connection";
    }
    case "DNS_FAILING":
      return "Reached the internet by IP, but DNS is not resolving";
    case "CAPTIVE_PORTAL":
      return "The network requires sign-in (captive portal)";
    case "INTERNET_DOWN":
      return "No verified HTTPS connection could be made";
    case "LAN_ONLY":
      return "The gateway did not respond";
    case "NO_INTERFACE":
      return "No active network connection";
    default:
      return "";
  }
}

function finalize(
  verdict: Verdict,
  layers: LayerResult[],
  prefs: EnginePrefs,
  reason: string,
  egressIp?: string,
): CheckReport {
  const meta = VERDICT_META[verdict];
  return {
    verdict,
    title: meta.title,
    emoji: meta.emoji,
    reason,
    layers,
    egressIp: prefs.showEgressIp ? egressIp : undefined,
    checkedAt: Date.now(),
  };
}

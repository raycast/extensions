/**
 * Certainty comes from independent, TLS-verified round-trips. A captive portal or
 * transparent proxy cannot present a valid certificate for these well-known hosts,
 * so a successful HTTPS handshake + expected fresh body is strong proof of real internet.
 */

export interface AnchorSpec {
  id: string;
  label: string;
  url: string;
  ipBased?: boolean;
}

export const ANCHORS: AnchorSpec[] = [
  // IP-based: also works when DNS is broken, and returns our public IP.
  { id: "cloudflare", label: "Cloudflare 1.1.1.1", url: "https://1.1.1.1/cdn-cgi/trace", ipBased: true },
  { id: "google", label: "Google gstatic", url: "https://www.gstatic.com/generate_204" },
  { id: "apple", label: "Apple captive", url: "https://captive.apple.com/hotspot-detect.html" },
];

// HTTP (not HTTPS) probe used only to distinguish a captive portal from plain "no internet".
export const CAPTIVE_PROBE = "http://connectivitycheck.gstatic.com/generate_204";

export interface AnchorResult {
  id: string;
  label: string;
  ok: boolean;
  latencyMs?: number;
  egressIp?: string;
  reason?: string;
}

function nonce(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function bust(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + "_=" + nonce();
}

async function timedFetch(url: string, timeoutMs: number, redirect: "manual" | "follow" = "manual"): Promise<Response> {
  return fetch(bust(url), {
    redirect,
    cache: "no-store",
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function checkAnchor(a: AnchorSpec, timeoutMs = 3000): Promise<AnchorResult> {
  const start = Date.now();
  try {
    const res = await timedFetch(a.url, timeoutMs);
    const latencyMs = Date.now() - start;
    const type = (res as { type?: string }).type;

    // undici returns an opaque redirect (status 0) for manual redirects, so treat it as intercepted.
    if (type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
      return { id: a.id, label: a.label, ok: false, latencyMs, reason: "redirected (portal?)" };
    }
    if (res.status === 204) {
      return { id: a.id, label: a.label, ok: true, latencyMs };
    }
    if (res.status === 200) {
      const body = await res.text();
      const egressIp = body.match(/(?:^|\n)ip=([0-9a-fA-F.:]+)/)?.[1];
      const looksSuccess = egressIp !== undefined || /success/i.test(body) || body.trim() === "";
      return looksSuccess
        ? { id: a.id, label: a.label, ok: true, latencyMs, egressIp }
        : { id: a.id, label: a.label, ok: false, latencyMs, reason: "unexpected body (portal?)" };
    }
    return { id: a.id, label: a.label, ok: false, latencyMs, reason: `HTTP ${res.status}` };
  } catch (e) {
    const err = e as { name?: string; message?: string; cause?: { code?: string } };
    const reason = err.name === "TimeoutError" ? "timeout" : err.cause?.code || err.message || "error";
    return { id: a.id, label: a.label, ok: false, reason };
  }
}

export interface InternetCheck {
  results: AnchorResult[];
  confirmed: number;
  // True when an IP-based endpoint verified, i.e. we reached the internet without needing DNS.
  ipVerified: boolean;
  // True when a hostname-based endpoint verified, which proves DNS resolution actually works.
  hostnameVerified: boolean;
  egressIp?: string;
}

export async function verifyInternet(timeoutMs = 3000): Promise<InternetCheck> {
  const settled = await Promise.allSettled(ANCHORS.map((a) => checkAnchor(a, timeoutMs)));
  const results: AnchorResult[] = settled.map((s, i) =>
    s.status === "fulfilled" ? s.value : { id: ANCHORS[i].id, label: ANCHORS[i].label, ok: false, reason: "error" },
  );
  return {
    results,
    confirmed: results.filter((r) => r.ok).length,
    ipVerified: results.some((r, i) => ANCHORS[i].ipBased === true && r.ok),
    hostnameVerified: results.some((r, i) => ANCHORS[i].ipBased !== true && r.ok),
    egressIp: results.find((r) => r.egressIp)?.egressIp,
  };
}

/** True when the network intercepts plain HTTP with a login page / redirect. */
export async function detectCaptive(timeoutMs = 3000): Promise<boolean> {
  try {
    const res = await timedFetch(CAPTIVE_PROBE, timeoutMs, "manual");
    const type = (res as { type?: string }).type;
    if (type === "opaqueredirect") return true;
    if (res.status === 204) return false; // clean at the HTTP layer
    return true; // any non-204 (200 login page, redirect, etc.) => portal
  } catch {
    return false; // no reply at all => just offline, not captive
  }
}

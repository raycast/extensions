import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type ServiceStatus = "ok" | "warning" | "danger" | "unknown";

export interface Service {
  name: string;
  slug: string;
  status: ServiceStatus;
  url: string;
}

export interface ServiceDetail extends Service {
  reportsLast24h: number | null;
  statusLabel: string;
  chartImageUrl: string | null; // original image URL (rarely present)
  chartDataUri: string | null; // generated SVG data URI from parsed JS data
}

export interface ReportType {
  id: string;
  label: string;
  value: string;
}

export const REPORT_TYPES: ReportType[] = [
  { id: "1", label: "Internet connectivity", value: "1" },
  { id: "2", label: "Total outage (service unreachable)", value: "2" },
  { id: "4", label: "Website connection", value: "4" },
  { id: "5", label: "Mobile app", value: "5" },
  { id: "8", label: "Performance / Slowness", value: "8" },
];

// ─── In-memory cache ──────────────────────────────────────────────────────────
// 5 minutes — long enough to avoid rate limits, short enough to stay fresh.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60_000;

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// Global: at most 1 outbound request every 2 seconds.

const MIN_INTERVAL_MS = 2000;
let lastRequestAt = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - now);
  lastRequestAt = now + wait;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

// ─── HTTP client (macOS curl) ─────────────────────────────────────────────────
// /usr/bin/curl on macOS uses SecureTransport / LibreSSL which produces a
// different TLS fingerprint than Node's OpenSSL — Cloudflare lets it through.

interface GetResult {
  body: string;
  status: number;
  cookies: string;
}

async function curlGet(
  url: string,
  extraHeaders: Record<string, string> = {},
): Promise<GetResult> {
  await rateLimit();

  const headerArgs: string[] = [
    "-H",
    "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "-H",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H",
    "Accept-Language: fr-FR,fr;q=0.9,en;q=0.8",
  ];
  for (const [k, v] of Object.entries(extraHeaders)) {
    headerArgs.push("-H", `${k}: ${v}`);
  }

  // -D - : dump response headers into stdout so we can parse Set-Cookie
  // -w sentinel: append HTTP status at the very end
  const args = [
    "-s",
    "-L",
    "--max-time",
    "15",
    "--compressed",
    "-D",
    "-",
    "-w",
    "\n__DD_STATUS__%{http_code}__DD_STATUS__",
    ...headerArgs,
    url,
  ];

  let raw = "";
  try {
    const result = await execFileAsync("/usr/bin/curl", args, {
      maxBuffer: 8 * 1024 * 1024,
    });
    raw = result.stdout;
  } catch (e: unknown) {
    const err = e as { stdout?: string; message?: string };
    raw = err.stdout ?? "";
    if (!raw) throw new Error(err.message ?? "curl a échoué");
  }

  const statusMatch = raw.match(/__DD_STATUS__(\d{3})__DD_STATUS__/);
  const status = statusMatch ? parseInt(statusMatch[1]) : 0;
  const withoutSentinel = raw.replace(/__DD_STATUS__\d{3}__DD_STATUS__/, "");

  if (status === 429) {
    const retryAfter = withoutSentinel.match(/Retry-After:\s*(\d+)/i)?.[1];
    throw Object.assign(
      new Error(
        `Trop de requêtes (429) — réessaie dans ${retryAfter ? retryAfter + "s" : "quelques secondes"}`,
      ),
      { code: 429 },
    );
  }

  // Headers are before the first blank line; body is after
  const blankLine = withoutSentinel.indexOf("\r\n\r\n");
  const headerBlock = blankLine >= 0 ? withoutSentinel.slice(0, blankLine) : "";
  const body =
    blankLine >= 0 ? withoutSentinel.slice(blankLine + 4) : withoutSentinel;

  const cookieMatches = [
    ...headerBlock.matchAll(/^Set-Cookie:\s*([^\r\n]+)/gim),
  ];
  const cookies = cookieMatches.map((m) => m[1].split(";")[0]).join("; ");

  return { body, status, cookies };
}

async function curlPost(
  url: string,
  data: string,
  extraHeaders: Record<string, string> = {},
): Promise<GetResult> {
  await rateLimit();

  const headerArgs: string[] = [
    "-H",
    "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "-H",
    "Content-Type: application/x-www-form-urlencoded",
  ];
  for (const [k, v] of Object.entries(extraHeaders)) {
    headerArgs.push("-H", `${k}: ${v}`);
  }

  const args = [
    "-s",
    "-L",
    "--max-time",
    "15",
    "-w",
    "\n__DD_STATUS__%{http_code}__DD_STATUS__",
    "-X",
    "POST",
    "--data-raw",
    data,
    ...headerArgs,
    url,
  ];

  const { stdout } = await execFileAsync("/usr/bin/curl", args, {
    maxBuffer: 2 * 1024 * 1024,
  });
  const statusMatch = stdout.match(/__DD_STATUS__(\d{3})__DD_STATUS__/);
  const status = statusMatch ? parseInt(statusMatch[1]) : 0;
  const body = stdout.replace(/__DD_STATUS__\d{3}__DD_STATUS__/, "");
  return { body, status, cookies: "" };
}

// ─── Locale-specific paths ────────────────────────────────────────────────────

const LOCALE_PATHS: Record<string, { search: string; status: string }> = {
  com: { search: "/search/", status: "/status/" },
  fr: { search: "/recherche/", status: "/statut/" },
  de: { search: "/suche/", status: "/status/" },
  "co.uk": { search: "/search/", status: "/status/" },
  es: { search: "/busqueda/", status: "/estado/" },
  it: { search: "/ricerca/", status: "/status/" },
  nl: { search: "/zoeken/", status: "/status/" },
};

/** Current Region preference, defaulting to the global `.com` site. */
export function getLocale(): string {
  return getPreferenceValues<Preferences>().locale ?? "com";
}

function getBaseUrl(): string {
  return `https://downdetector.${getLocale()}`;
}

function getLocalePaths() {
  return LOCALE_PATHS[getLocale()] ?? LOCALE_PATHS["com"];
}

/** Build the status page URL for a slug, honoring the Region preference. */
export function getStatusUrl(slug: string): string {
  const { status: statusPath } = getLocalePaths();
  return `${getBaseUrl()}${statusPath}${slug}/`;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export interface ChartPoint {
  x: number;
  y: number;
  baseline: number;
}

/**
 * Extract chart data directly from the Downdetector page HTML.
 *
 * Downdetector embeds the 24h timeseries in the RSC payload (self.__next_f.push)
 * as a GraphQL-style object. The raw HTML has JSON double-encoded inside a JS string,
 * so all double-quotes appear as \" (literal backslash + quote).
 *
 * Format found in the HTML:
 *   "chartData":{"__typename":"ChartDataType","dataPoints":[
 *     {"__typename":"ChartDataPointType","timestampUtc":"2026-06-11T09:17:20+00:00",
 *      "reportsValue":3,"baselineValue":0}, ...
 *   ]}
 */
export function parseChartData(html: string): ChartPoint[] | null {
  // Find "dataPoints" near a "chartData" key
  const dpIdx = html.indexOf("dataPoints");
  if (dpIdx < 0) return null;
  const chartIdx = html.lastIndexOf("chartData", dpIdx);
  if (chartIdx < 0 || dpIdx - chartIdx > 300) return null;

  // Locate the opening bracket of the array
  const arrStart = html.indexOf("[", dpIdx);
  if (arrStart < 0) return null;

  // Walk forward counting brackets to find the matching close
  let depth = 0,
    arrEnd = -1;
  for (let i = arrStart; i < Math.min(html.length, arrStart + 200_000); i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]" && --depth === 0) {
      arrEnd = i;
      break;
    }
  }
  if (arrEnd < 0) return null;

  // Unescape the RSC JSON-in-JS-string encoding (\\" → " and \\\\ → \\)
  const raw = html
    .slice(arrStart, arrEnd + 1)
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  try {
    const arr = JSON.parse(raw) as Array<{
      timestampUtc?: string;
      reportsValue?: number;
      baselineValue?: number;
    }>;
    const points: ChartPoint[] = arr
      .filter(
        (d) =>
          d.timestampUtc !== undefined && typeof d.reportsValue === "number",
      )
      .map((d) => ({
        x: new Date(d.timestampUtc!).getTime(),
        y: d.reportsValue!,
        baseline: d.baselineValue ?? 0,
      }))
      .filter((p) => !isNaN(p.x) && p.y >= 0);
    return points.length >= 6 ? points : null;
  } catch {
    return null;
  }
}

/** Generate a SVG area chart with baseline from time-series data, returned as a base64 data URI. */
export function buildChartDataUri(
  points: ChartPoint[],
  status: ServiceStatus,
): string {
  const W = 640,
    H = 150;
  const PAD = { top: 10, right: 12, bottom: 26, left: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxY = Math.max(...points.map((p) => Math.max(p.y, p.baseline)), 1);

  const color =
    status === "danger"
      ? "#e84c4c"
      : status === "warning"
        ? "#f97316"
        : "#22c55e";

  const px = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const py = (y: number) => PAD.top + (1 - y / maxY) * innerH;

  const linePoints = points.map(
    (p, i) => `${px(i).toFixed(1)},${py(p.y).toFixed(1)}`,
  );
  const areaClose = [
    `${px(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}`,
    `${px(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)}`,
  ];

  // Baseline dashed line (only if baseline data is present)
  const hasBaseline = points.some((p) => p.baseline > 0);
  const baselinePoints = hasBaseline
    ? points
        .map((p, i) => `${px(i).toFixed(1)},${py(p.baseline).toFixed(1)}`)
        .join(" ")
    : "";

  // Hour labels: ~6 evenly spaced ticks
  const tickCount = Math.min(6, points.length);
  const tickStep = Math.max(
    1,
    Math.floor((points.length - 1) / (tickCount - 1)),
  );
  const tickLabels = Array.from({ length: tickCount }, (_, t) => {
    const idx = Math.min(t * tickStep, points.length - 1);
    const p = points[idx];
    const label =
      p.x > 1_000_000_000
        ? new Date(p.x).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : `${idx}h`;
    return `<text x="${px(idx).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#9ca3af">${label}</text>`;
  });

  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="transparent"/>
  <line x1="${PAD.left}" y1="${PAD.top + innerH}" x2="${PAD.left + innerW}" y2="${PAD.top + innerH}" stroke="#374151" stroke-width="1"/>
  <polygon points="${[...linePoints, ...areaClose].join(" ")}" fill="url(#g)"/>
  <polyline points="${linePoints.join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${hasBaseline ? `<polyline points="${baselinePoints}" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="4,3" stroke-linejoin="round"/>` : ""}
  ${tickLabels.join("\n  ")}
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function parseStatus(html: string): ServiceStatus {
  // CSS class patterns
  if (/signal-danger|status-danger|legend-danger/i.test(html)) return "danger";
  if (/signal-warning|status-warning|legend-warning/i.test(html))
    return "warning";
  if (/signal-ok|status-ok|legend-ok/i.test(html)) return "ok";

  // Embedded JSON state (e.g. "status":"ok" or status:0/1/2)
  const jsonMatch = html.match(/"status"\s*:\s*"?(\w+)"?/i);
  if (jsonMatch) {
    const v = jsonMatch[1].toLowerCase();
    if (v === "danger" || v === "3") return "danger";
    if (v === "warning" || v === "2") return "warning";
    if (v === "ok" || v === "1" || v === "0") return "ok";
  }

  // Color cues
  if (/#e84c4c|#cc0000|#d9534f/i.test(html)) return "danger";
  if (/#ffa500|#f0ad4e|#ff8c00/i.test(html)) return "warning";
  if (/#86d60a|#5cb85c|#28a745/i.test(html)) return "ok";

  // Text fallback (FR + EN)
  if (/panne\s+g[eé]n[eé]rale|major\s+outage/i.test(html)) return "danger";
  if (/probl[eè]mes?\s+signal|user\s+reports\s+indicate\s+problem/i.test(html))
    return "warning";
  if (/fonctionnement\s+normal|no\s+current\s+problems/i.test(html))
    return "ok";

  return "unknown";
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function statusDefaultLabel(status: ServiceStatus): string {
  switch (status) {
    case "ok":
      return "Normal operation";
    case "warning":
      return "Issues reported";
    case "danger":
      return "Outage reported";
    default:
      return "Unknown status";
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchServices(query: string): Promise<Service[]> {
  const cacheKey = `search:${getLocale()}:${query}`;
  const cached = cacheGet<Service[]>(cacheKey);
  if (cached) return cached;

  const baseUrl = getBaseUrl();
  const { search: searchPath, status: statusPath } = getLocalePaths();

  // Try locale-specific path, then /search/ fallback, then /recherche/
  let html = "";
  const searchPaths = [searchPath, "/search/", "/recherche/"].filter(
    (p, i, arr) => arr.indexOf(p) === i,
  );
  for (const path of searchPaths) {
    const url = `${baseUrl}${path}?q=${encodeURIComponent(query)}`;
    const res = await curlGet(url);
    if (res.status === 200) {
      html = res.body;
      break;
    }
    if (res.status !== 404 && res.status !== 403)
      throw new Error(`HTTP ${res.status} — ${url}`);
  }

  // Last resort: try the status page directly from the slugified query
  if (!html) {
    const slug = slugify(query);
    const url = `${baseUrl}${statusPath}${slug}/`;
    const res = await curlGet(url);
    if (res.status === 200) {
      const name = decodeHtmlEntities(
        res.body.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ?? query,
      );
      const services = [{ slug, name, status: parseStatus(res.body), url }];
      cacheSet(cacheKey, services);
      return services;
    }
    throw new Error(`Service introuvable pour "${query}"`);
  }

  const services: Service[] = [];

  // Primary regex: href="/status/{slug}/" near signal class + title
  const cardRegex =
    /href="\/(?:status|statut|estado|status)\/([^"/]+)\/"[^<]*(?:<[^>]*>)*[^<]*(?:<[^>]*>)*[^<]*(?:signal|status|legend)-(\w+)[^<]*(?:<[^>]*>)*\s*<\/[^>]+>\s*(?:<[^>]*>)*([^<]+)/gi;

  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const slug = match[1];
    const signal = match[2].toLowerCase() as ServiceStatus;
    const name = decodeHtmlEntities(match[3].trim());
    if (slug && name && !services.find((s) => s.slug === slug)) {
      services.push({
        slug,
        name,
        status: ["ok", "warning", "danger"].includes(signal)
          ? signal
          : "unknown",
        url: `${baseUrl}${statusPath}${slug}/`,
      });
    }
  }

  // Fallback: separate passes
  if (services.length === 0) {
    const slugPattern = /href="\/(?:status|statut|estado)\/([^"/]+)\/"/gi;
    const titlePattern =
      /<(?:h[1-6]|span)[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\//gi;
    const signalPattern = /(?:signal|status|legend)-(\w+)/gi;

    const slugs = [...html.matchAll(slugPattern)].map((m) => m[1]);
    const titles = [...html.matchAll(titlePattern)].map((m) =>
      decodeHtmlEntities(m[1]),
    );
    const signals = [...html.matchAll(signalPattern)].map((m) =>
      m[1].toLowerCase(),
    );

    for (let i = 0; i < Math.min(slugs.length, titles.length); i++) {
      const status = signals[i] as ServiceStatus;
      services.push({
        slug: slugs[i],
        name: titles[i],
        status: ["ok", "warning", "danger"].includes(status)
          ? status
          : "unknown",
        url: `${baseUrl}${statusPath}${slugs[i]}/`,
      });
    }
  }

  cacheSet(cacheKey, services);
  return services;
}

export async function getServiceDetail(slug: string): Promise<ServiceDetail> {
  const cacheKey = `detail:${getLocale()}:${slug}`;
  const cached = cacheGet<ServiceDetail>(cacheKey);
  if (cached) return cached;

  const baseUrl = getBaseUrl();
  const { status: statusPath } = getLocalePaths();
  const url = `${baseUrl}${statusPath}${slug}/`;
  const { body: html, status } = await curlGet(url);

  if (status !== 200) throw new Error(`HTTP ${status} — ${url}`);

  const titleMatch =
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ?? html.match(/<title>([^<|–-]+)/i);
  const name = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? slug);

  const serviceStatus = parseStatus(html);
  const labelMatch = html.match(
    /class="[^"]*(?:signal|status)[^"]*"[^>]*>\s*([^<]+)</i,
  );
  const statusLabel =
    labelMatch?.[1]?.trim() || statusDefaultLabel(serviceStatus);

  const reportsMatch = html.match(
    /(\d[\d\s,.]+)\s*(?:signalement|rapport|report)/i,
  );
  const reportsLast24h = reportsMatch
    ? parseInt(reportsMatch[1].replace(/[\s,.]/g, ""), 10)
    : null;

  // Chart: data is embedded directly in the RSC payload as chartData.dataPoints
  const chartPoints = parseChartData(html);
  const chartDataUri = chartPoints
    ? buildChartDataUri(chartPoints, serviceStatus)
    : null;
  const chartImageUrl: string | null = null; // kept for interface compat, no longer needed

  const detail = {
    slug,
    name,
    status: serviceStatus,
    statusLabel,
    reportsLast24h,
    chartImageUrl,
    chartDataUri,
    url,
  };
  cacheSet(cacheKey, detail);
  return detail;
}

export async function submitReport(
  slug: string,
  problemType: string,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();
  const { status: statusPath } = getLocalePaths();
  const pageUrl = `${baseUrl}${statusPath}${slug}/`;

  const { body: html, cookies, status: pageStatus } = await curlGet(pageUrl);
  if (pageStatus !== 200) {
    return {
      success: false,
      error: `Impossible d'atteindre Downdetector (HTTP ${pageStatus})`,
    };
  }

  const csrfMatch =
    html.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/) ??
    html.match(/csrfmiddlewaretoken['":\s]+['"]([a-zA-Z0-9]+)['"]/);

  if (!csrfMatch) {
    return {
      success: false,
      error: "Token CSRF introuvable — le site a peut-être changé.",
    };
  }

  const csrfToken = csrfMatch[1];
  const csrfCookie = cookies.match(/csrftoken=([^;]+)/)?.[1] ?? "";
  const body = new URLSearchParams({
    csrfmiddlewaretoken: csrfToken,
    problem_type: problemType,
  }).toString();

  const reportUrl = `${baseUrl}${statusPath}${slug}/report/`;
  const { status: reportStatus } = await curlPost(reportUrl, body, {
    Referer: pageUrl,
    Cookie: csrfCookie ? `csrftoken=${csrfCookie}` : "",
    "X-CSRFToken": csrfToken,
  });

  return reportStatus < 400
    ? { success: true }
    : { success: false, error: `Échec de l'envoi (HTTP ${reportStatus})` };
}

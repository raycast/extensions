/**
 * Analyses an HTTP Archive (HAR 1.2) the way a performance review reads one:
 * totals and the critical shape first (how many requests, how heavy, how
 * much of it third-party), then the offenders — slowest requests by phase
 * (blocked, DNS, connect, TLS, wait, receive), biggest transfers, cache
 * misses, errors and redirect chains.
 *
 * HAR files carry cookies, auth headers and full URLs, which is exactly why
 * this parses in the browser and nothing is sent anywhere. Format: the HAR
 * 1.2 spec (the W3C Web Performance WG archive of Jan Odvarko's spec); a
 * timing of -1 means "does not apply", per spec, and is excluded from
 * phase sums rather than treated as zero.
 *
 * Dependency-free on purpose: the CLI bundles it.
 */

export type HarPhase = 'blocked' | 'dns' | 'connect' | 'ssl' | 'send' | 'wait' | 'receive';

export type HarRequest = {
  url: string;
  host: string;
  method: string;
  status: number;
  mimeType: string;
  /** Bytes on the wire (response bodySize + headersSize when recorded). */
  transferBytes: number;
  /** Decoded body size when the recorder kept it. */
  contentBytes: number;
  timeMs: number;
  phases: Partial<Record<HarPhase, number>>;
  startedAt: number;
  fromCache: boolean;
  thirdParty: boolean;
};

export type HarSummary = {
  pages: { title: string; onContentLoadMs?: number; onLoadMs?: number }[];
  firstPartyHost?: string;
  requestCount: number;
  totalTransferBytes: number;
  totalContentBytes: number;
  totalTimeMs: number;
  /** Wall-clock span from first request start to last request end. */
  spanMs: number;
  byStatusClass: Record<string, number>;
  byType: { type: string; count: number; transferBytes: number }[];
  hosts: { host: string; count: number; transferBytes: number; thirdParty: boolean }[];
  thirdPartyShare: { requests: number; transferBytes: number };
  slowest: HarRequest[];
  biggest: HarRequest[];
  /** Where the time went, phase by phase, over all requests. */
  phaseTotals: Record<HarPhase, number>;
  errors: { url: string; status: number }[];
  redirects: { from: string; to: string; status: number }[];
  uncompressedText: { url: string; contentBytes: number }[];
  cacheHits: number;
};

const short = (url: string): string => {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 60 ? `${u.pathname.slice(0, 57)}...` : u.pathname;
    return u.host + path + (u.search ? '?…' : '');
  } catch {
    return url.slice(0, 80);
  }
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

/**
 * Public suffixes with more than one label, under which each next label is a
 * separate owner: shop.example.co.uk and tracker.other.co.uk are two sites,
 * not one. Taking the last two labels, as this used to, merged every site
 * under co.uk (or com.au, github.io...) into one party and hid their
 * cross-site requests from the third-party totals.
 *
 * A curated list rather than the full Public Suffix List (publicsuffix.org,
 * about 10,000 rules): this module is bundled into the CLI and the editor
 * plugins and vendored into the Raycast extension, which take no third-party
 * code, and tldts, the usual PSL library, is 130 KB minified. The list holds
 * the second-level registries of the larger country domains and the hosting
 * platforms a HAR most often shows; src/test/tools/local-tools-data-fidelity.test.ts
 * checks every entry against the PSL copy in tldts. A suffix missing from it
 * errs the old way (two sites read as one party), never the other.
 */
const MULTI_LABEL_SUFFIXES = new Set([
  // United Kingdom, Australia, New Zealand
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'ac.uk', 'gov.uk', 'nhs.uk', 'police.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'asn.au', 'id.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz', 'school.nz', 'geek.nz', 'gen.nz', 'kiwi.nz',
  // East and South-East Asia
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp', 'ed.jp', 'gr.jp', 'lg.jp', 'ad.jp',
  'co.kr', 'or.kr', 'ne.kr', 'go.kr', 'ac.kr', 're.kr',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'com.hk', 'org.hk', 'net.hk', 'edu.hk', 'gov.hk',
  'com.tw', 'org.tw', 'net.tw', 'edu.tw', 'gov.tw',
  'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg',
  'com.my', 'net.my', 'org.my', 'edu.my', 'gov.my',
  'co.id', 'or.id', 'ac.id', 'go.id', 'web.id', 'net.id', 'my.id', 'sch.id',
  'co.th', 'in.th', 'ac.th', 'go.th', 'or.th', 'net.th',
  'com.ph', 'net.ph', 'org.ph', 'gov.ph', 'edu.ph',
  'com.vn', 'net.vn', 'org.vn', 'edu.vn', 'gov.vn',
  // South Asia, Middle East, Africa
  'co.in', 'net.in', 'org.in', 'firm.in', 'gen.in', 'ind.in', 'ac.in', 'edu.in', 'gov.in', 'res.in',
  'com.pk', 'net.pk', 'org.pk', 'edu.pk', 'gov.pk', 'com.bd',
  'co.il', 'org.il', 'net.il', 'ac.il', 'gov.il',
  'com.tr', 'net.tr', 'org.tr', 'gov.tr', 'edu.tr', 'gen.tr', 'biz.tr',
  'com.sa', 'co.ae', 'net.ae', 'org.ae', 'gov.ae', 'ac.ae', 'com.eg',
  'co.za', 'org.za', 'net.za', 'gov.za', 'ac.za', 'web.za',
  'com.ng', 'org.ng', 'gov.ng', 'edu.ng', 'co.ke', 'or.ke', 'go.ke', 'ac.ke',
  // Americas and Europe
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'art.br', 'blog.br', 'app.br',
  'com.ar', 'net.ar', 'org.ar', 'gob.ar', 'edu.ar',
  'com.mx', 'net.mx', 'org.mx', 'gob.mx', 'edu.mx',
  'com.co', 'net.co', 'org.co', 'gov.co', 'edu.co', 'com.pe', 'gob.pe',
  'com.ua', 'net.ua', 'org.ua', 'gov.ua', 'in.ua',
  'com.es', 'org.es', 'nom.es', 'gob.es', 'edu.es', 'com.pl', 'net.pl', 'org.pl', 'gov.pl', 'gouv.fr',
  // Hosting platforms listed in the PSL's private section: each subdomain is a different owner.
  'github.io', 'gitlab.io', 'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'herokuapp.com',
  'web.app', 'firebaseapp.com', 'appspot.com', 'azurewebsites.net', 'cloudfront.net', 'blogspot.com',
  'onrender.com', 'fly.dev', 'myshopify.com', 'ngrok.io', 'ngrok-free.app',
]);

/** Exported for the test that checks the list against the Public Suffix List. */
export const HAR_MULTI_LABEL_SUFFIXES: ReadonlySet<string> = MULTI_LABEL_SUFFIXES;

/**
 * The site a host belongs to, for deciding first or third party:
 * www.example.com and cdn.example.com are one party, as are www.example.co.uk
 * and cdn.example.co.uk. The port is not part of the site, and an IP address
 * is its own party.
 */
export const baseDomain = (host: string): string => {
  const h = host.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (h.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return h;
  const labels = h.split('.');
  const take = MULTI_LABEL_SUFFIXES.has(labels.slice(-2).join('.')) ? 3 : 2;
  return labels.slice(-take).join('.');
};

const typeOf = (mime: string): string => {
  const m = mime.toLowerCase();
  if (m.includes('javascript') || m.includes('ecmascript')) return 'script';
  if (m.includes('css')) return 'style';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('font/') || m.includes('font')) return 'font';
  if (m.includes('json') || m.includes('xml') || m.includes('protobuf') || m.includes('grpc')) return 'data';
  if (m.startsWith('text/html')) return 'document';
  if (m.startsWith('video/') || m.startsWith('audio/')) return 'media';
  if (!m) return 'other';
  return 'other';
};

const PHASES: HarPhase[] = ['blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive'];

export function parseHar(json: string): HarSummary {
  let root: any;
  try {
    root = JSON.parse(json);
  } catch {
    throw new Error('Not valid JSON. A HAR file is the JSON the browser saves from DevTools → Network → Export HAR.');
  }
  const log = root?.log;
  if (!log || !Array.isArray(log.entries)) throw new Error('Not a HAR file: log.entries is missing (HAR 1.2 wraps everything in a "log" object).');

  const pages = (log.pages ?? []).map((p: any) => ({
    title: String(p.title ?? p.id ?? ''),
    onContentLoadMs: p.pageTimings?.onContentLoad > 0 ? p.pageTimings.onContentLoad : undefined,
    onLoadMs: p.pageTimings?.onLoad > 0 ? p.pageTimings.onLoad : undefined,
  }));

  const requests: HarRequest[] = [];
  const redirects: HarSummary['redirects'] = [];

  // The first party is the first document's host; everything whose base
  // domain differs is third-party.
  let firstHost = '';
  for (const e of log.entries) {
    const mime = String(e.response?.content?.mimeType ?? '');
    if (!firstHost && typeOf(mime) === 'document') firstHost = hostOf(String(e.request?.url ?? ''));
  }
  if (!firstHost && log.entries.length) firstHost = hostOf(String(log.entries[0].request?.url ?? ''));
  const firstBase = baseDomain(firstHost);

  for (const e of log.entries) {
    const url = String(e.request?.url ?? '');
    const status = Number(e.response?.status ?? 0);
    const bodySize = Number(e.response?.bodySize ?? -1);
    const headersSize = Number(e.response?.headersSize ?? -1);
    const transfer = Number(e.response?._transferSize ?? (bodySize >= 0 ? bodySize + Math.max(headersSize, 0) : 0));
    const content = Number(e.response?.content?.size ?? 0);
    const phases: HarRequest['phases'] = {};
    for (const ph of PHASES) {
      const v = Number(e.timings?.[ph] ?? -1);
      if (v >= 0) phases[ph] = v;
    }
    const host = hostOf(url);
    const fromCache = transfer === 0 && status !== 0 && bodySize <= 0 && content > 0;
    const req: HarRequest = {
      url: short(url),
      host,
      method: String(e.request?.method ?? 'GET'),
      status,
      mimeType: mime(e),
      transferBytes: Math.max(transfer, 0),
      contentBytes: Math.max(content, 0),
      timeMs: Math.max(Number(e.time ?? 0), 0),
      phases,
      startedAt: Date.parse(e.startedDateTime ?? '') || 0,
      fromCache,
      thirdParty: baseDomain(host) !== firstBase,
    };
    requests.push(req);
    if (status >= 300 && status < 400) {
      const loc = (e.response?.headers ?? []).find((h: any) => String(h.name).toLowerCase() === 'location');
      if (loc) redirects.push({ from: short(url), to: short(String(loc.value)), status });
    }
  }
  function mime(e: any): string {
    return String(e.response?.content?.mimeType ?? '').split(';')[0];
  }

  const byStatusClass: Record<string, number> = {};
  for (const r of requests) {
    const cls = r.status === 0 ? 'failed' : `${Math.floor(r.status / 100)}xx`;
    byStatusClass[cls] = (byStatusClass[cls] ?? 0) + 1;
  }

  const typeMap = new Map<string, { count: number; transferBytes: number }>();
  for (const r of requests) {
    const t = typeOf(r.mimeType);
    const agg = typeMap.get(t) ?? { count: 0, transferBytes: 0 };
    agg.count += 1;
    agg.transferBytes += r.transferBytes;
    typeMap.set(t, agg);
  }

  const hostMap = new Map<string, { count: number; transferBytes: number; thirdParty: boolean }>();
  for (const r of requests) {
    const agg = hostMap.get(r.host) ?? { count: 0, transferBytes: 0, thirdParty: r.thirdParty };
    agg.count += 1;
    agg.transferBytes += r.transferBytes;
    hostMap.set(r.host, agg);
  }

  const phaseTotals = Object.fromEntries(PHASES.map((p) => [p, 0])) as Record<HarPhase, number>;
  for (const r of requests) for (const ph of PHASES) phaseTotals[ph] += r.phases[ph] ?? 0;

  const third = requests.filter((r) => r.thirdParty);
  const ends = requests.map((r) => r.startedAt + r.timeMs).filter(Boolean);
  const starts = requests.map((r) => r.startedAt).filter(Boolean);

  const uncompressedText = requests
    .filter((r) => ['script', 'style', 'document', 'data'].includes(typeOf(r.mimeType)))
    .filter((r) => r.contentBytes > 10_000 && r.transferBytes >= r.contentBytes * 0.98 && !r.fromCache)
    .sort((a, b) => b.contentBytes - a.contentBytes)
    .slice(0, 10)
    .map((r) => ({ url: r.url, contentBytes: r.contentBytes }));

  return {
    pages,
    firstPartyHost: firstHost || undefined,
    requestCount: requests.length,
    totalTransferBytes: requests.reduce((s, r) => s + r.transferBytes, 0),
    totalContentBytes: requests.reduce((s, r) => s + r.contentBytes, 0),
    totalTimeMs: requests.reduce((s, r) => s + r.timeMs, 0),
    spanMs: ends.length ? Math.max(...ends) - Math.min(...starts) : 0,
    byStatusClass,
    byType: [...typeMap.entries()].map(([type, a]) => ({ type, ...a })).sort((a, b) => b.transferBytes - a.transferBytes),
    hosts: [...hostMap.entries()].map(([host, a]) => ({ host, ...a })).sort((a, b) => b.transferBytes - a.transferBytes).slice(0, 15),
    thirdPartyShare: { requests: third.length, transferBytes: third.reduce((s, r) => s + r.transferBytes, 0) },
    slowest: [...requests].sort((a, b) => b.timeMs - a.timeMs).slice(0, 10),
    biggest: [...requests].sort((a, b) => b.transferBytes - a.transferBytes).slice(0, 10),
    phaseTotals,
    errors: requests.filter((r) => r.status >= 400 || r.status === 0).map((r) => ({ url: r.url, status: r.status })),
    redirects: redirects.slice(0, 20),
    uncompressedText,
    cacheHits: requests.filter((r) => r.fromCache).length,
  };
}

const iec = (n: number): string => {
  if (n < 1024) return `${n} B`;
  const units = ['KiB', 'MiB', 'GiB'];
  let v = n;
  let u = -1;
  do { v /= 1024; u += 1; } while (v >= 1024 && u < units.length - 1);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
};

export function renderHarSummary(h: HarSummary): string {
  const lines: string[] = [];
  const page = h.pages[0];
  lines.push(
    `${h.requestCount} requests  ·  ${iec(h.totalTransferBytes)} transferred (${iec(h.totalContentBytes)} decoded)  ·  ${(h.spanMs / 1000).toFixed(1)}s span${h.cacheHits ? `  ·  ${h.cacheHits} from cache` : ''}`,
  );
  if (page?.onLoadMs) lines.push(`page load ${(page.onLoadMs / 1000).toFixed(2)}s${page.onContentLoadMs ? `, DOMContentLoaded ${(page.onContentLoadMs / 1000).toFixed(2)}s` : ''}`);
  const statuses = Object.entries(h.byStatusClass).sort().map(([c, n]) => `${n} ${c}`).join(', ');
  lines.push(`status: ${statuses}`);
  if (h.thirdPartyShare.requests) {
    const pct = h.totalTransferBytes ? Math.round((100 * h.thirdPartyShare.transferBytes) / h.totalTransferBytes) : 0;
    lines.push(`third-party: ${h.thirdPartyShare.requests} requests, ${iec(h.thirdPartyShare.transferBytes)} (${pct}% of transfer)`);
  }
  lines.push('', 'by type');
  for (const t of h.byType) lines.push(`  ${iec(t.transferBytes).padStart(9)}  ${String(t.count).padStart(4)} ×  ${t.type}`);
  lines.push('', 'where the time went (sum over requests)');
  const phases = Object.entries(h.phaseTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  for (const [ph, v] of phases) lines.push(`  ${(v / 1000).toFixed(2).padStart(8)}s  ${ph}`);
  lines.push('', 'slowest');
  for (const r of h.slowest.slice(0, 5)) lines.push(`  ${r.timeMs.toFixed(0).padStart(6)} ms  ${r.status}  ${r.url}`);
  lines.push('', 'heaviest');
  for (const r of h.biggest.slice(0, 5)) lines.push(`  ${iec(r.transferBytes).padStart(9)}  ${r.url}`);
  if (h.errors.length) {
    lines.push('', `errors (${h.errors.length})`);
    for (const e of h.errors.slice(0, 5)) lines.push(`  ${e.status || 'failed'}  ${e.url}`);
  }
  if (h.redirects.length) {
    lines.push('', `redirects (${h.redirects.length})`);
    for (const r of h.redirects.slice(0, 5)) lines.push(`  ${r.status}  ${r.from} -> ${r.to}`);
  }
  if (h.uncompressedText.length) {
    lines.push('', 'text served without compression');
    for (const u of h.uncompressedText.slice(0, 5)) lines.push(`  ${iec(u.contentBytes).padStart(9)}  ${u.url}`);
  }
  return lines.join('\n');
}

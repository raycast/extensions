import { WellKnownData, WellKnownHit } from "../types";
import { LIMITS, TIMEOUTS } from "./config";
import type { ResourceShape } from "./fetcher";
import { probeResource } from "./fetcher";
import { getLogger } from "./logger";
import { redactUrlForLog } from "./urlUtils";
import { WELL_KNOWN_CATALOG, WellKnownEntry } from "./wellKnownCatalog";
import { loadCatalog, refreshCatalogIfStale } from "./wellKnownRegistry";

const log = getLogger("wellknown");

/**
 * The paths actually swept. Entries a bare GET cannot answer are excluded here
 * rather than filtered later, so `probed` counts only questions that were asked.
 */
function probedPaths(catalog: readonly WellKnownEntry[]): readonly WellKnownEntry[] {
  return catalog.filter((e) => e.probe !== false);
}

/**
 * `/.well-known/` cannot be listed. It is a path prefix, not a resource, and no
 * standard index exists — a GET on the bare directory returns whatever the server
 * does for an unknown path. The only way to see what a host publishes there is to
 * probe the known paths and judge each answer.
 */

/**
 * The only statuses that mean "this host does not publish that file". Everything
 * else non-200 — 403, 429, 500, 503 — is the server declining to answer, and
 * recording it as absence is the defect this codebase keeps re-committing.
 * Enumerate the benign set; let the open set fail closed.
 */
const ABSENT_STATUSES = new Set([404, 410]);

/**
 * Paths whose specification defines an HTML destination, so the content-type
 * rule below must not apply to them — but ONLY when the response actually
 * redirected.
 *
 * `change-password` is specified as a redirect to the site's ordinary
 * password-change page, which is HTML by design.
 * https://w3c.github.io/webappsec-change-password-url/#change-password-urls
 *
 * The redirect is what separates a real one from a single-page app serving its
 * shell: github.com and facebook.com both take two hops to a login page, while
 * muse.ai returns 86KB of its own HTML at the original URL with no redirect at
 * all. Exempting the path from the content-type rule without also requiring the
 * hop re-opens the SPA hole for exactly this path.
 */
const HTML_IS_VALID = new Set(["change-password"]);

/**
 * A well-known probe is judged by its OPENING BYTES, not its status code and not
 * its Content-Type.
 *
 * Single-page apps serve their HTML shell for every unmatched path, with HTTP 200.
 * muse.ai answers 200 to 103 of the 104 registered paths — `/.well-known/csipaus`
 * and `/.well-known/thread` included — so trusting the status reports 103 findings
 * where there are two. The Content-Type gets most of the rest, but it is the
 * server's claim about itself: a catch-all serving that same shell as `text/plain`
 * walks straight past a header rule. `probeResource` reads the first KB and says
 * what the bytes are, which is the same question the sitemap check asks.
 *
 * Text and HTML both remain acceptable formats — `security.txt` is text and
 * `change-password` is a real HTML page. What is rejected is an HTML *document*
 * where a data file was requested.
 */
function isRealResource(path: string, probe: { shape: ResourceShape; redirected: boolean; finalUrl: string }): boolean {
  if (HTML_IS_VALID.has(path)) {
    // A redirect alone is not enough: a host that bounces every unknown path to
    // its homepage would have its homepage listed as a password-change endpoint.
    // A real one lands somewhere specific — github.com/login, facebook.com/login.php.
    if (!probe.redirected) return false;
    try {
      return new URL(probe.finalUrl).pathname.replace(/\/+$/, "") !== "";
    } catch {
      return false;
    }
  }
  return probe.shape !== "html" && probe.shape !== "empty";
}

/** What one probe established. `null` is a real answer; a throw is no answer. */
type ProbeOutcome = WellKnownHit | null;

/**
 * Probes one path. Resolves to a hit, or `null` when the host answered that the
 * file is not there. REJECTS when the question never got an answer — a caller
 * that cannot tell those apart reports an unreachable host as a host publishing
 * nothing.
 */
async function probeOne(baseUrl: string, entry: WellKnownEntry, signal: AbortSignal): Promise<ProbeOutcome> {
  const { path } = entry;
  const url = new URL(`/.well-known/${path}`, baseUrl).href;
  const probe = await probeResource(url, { timeout: TIMEOUTS.RESOURCE_FETCH, signal });

  if (probe.status !== 200) {
    if (ABSENT_STATUSES.has(probe.status)) return null;
    // `fetch` resolves for a 500 as readily as for a 404. Only a throw keeps
    // this path out of the "not published" column.
    throw new Error(`HTTP ${probe.status}`);
  }
  // A challenge page and a truncated whitespace prefix are non-answers. Letting
  // either return null files them as "this host publishes no such file", which
  // is the absence claim this whole module exists to avoid.
  if (probe.shape === "challenge") throw new Error("Blocked by a bot challenge");
  if (probe.shape === "unknown") throw new Error("Response was still whitespace at the sniff limit");
  if (!isRealResource(path, probe)) return null;

  return {
    path,
    url: probe.finalUrl,
    registration: entry.status,
    reference: entry.reference,
    contentType: probe.contentType ?? `(unlabelled ${probe.shape})`,
    size: probe.size,
  };
}

/** Runs `task` over `items` with at most `limit` in flight. */
async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        await task(items[next++]);
      }
    }),
  );
}

/**
 * A control path no host publishes. If a probe for THIS comes back looking like a
 * real file, the host answers every request with something — and every one of the
 * catalog hits is that same catch-all, not a published file.
 *
 * Without it, a host that returns 200 `application/json` `{"error":"not found"}`
 * for unknown paths reports all 110 paths as published. One extra request
 * settles what no amount of per-path judgement can.
 */
const CONTROL_PATH = "digger-control-probe-0e6f1a";

export async function fetchWellKnown(baseUrl: string, signal?: AbortSignal): Promise<WellKnownData> {
  const budget = AbortSignal.timeout(TIMEOUTS.WELL_KNOWN_TOTAL);
  const deadline = signal ? AbortSignal.any([budget, signal]) : budget;

  // The refresh is deliberately NOT awaited: it must never add latency to a
  // dig, and its result is for the next one. A failure inside it is swallowed.
  void refreshCatalogIfStale().catch(() => undefined);

  // A storage failure here must not fail the sweep; the shipped catalog is valid.
  const catalog = await loadCatalog().catch(() => WELL_KNOWN_CATALOG);
  const paths = probedPaths(catalog);

  log.log("probe:start", { url: redactUrlForLog(baseUrl), paths: paths.length });

  const hits: WellKnownHit[] = [];
  const unchecked: string[] = [];
  let answered = 0;
  let firstError: unknown;

  // Runs alongside the sweep rather than before it, so it costs no extra latency.
  const controlPromise: Promise<{ outcome: "hit" | "absent" | "failed" }> = probeOne(
    baseUrl,
    { path: CONTROL_PATH, status: "unregistered" },
    deadline,
  ).then(
    (hit) => ({ outcome: hit ? ("hit" as const) : ("absent" as const) }),
    () => ({ outcome: "failed" as const }),
  );

  await mapWithConcurrency(paths, LIMITS.WELL_KNOWN_CONCURRENCY, async (entry) => {
    try {
      const hit = await probeOne(baseUrl, entry, deadline);
      answered++;
      if (hit) hits.push(hit);
    } catch (e) {
      // Which paths failed is worth keeping; 110 individual reasons are not. One
      // reason IS kept, so the whole-sweep failure below can say why rather than
      // only how many.
      unchecked.push(entry.path);
      if (firstError === undefined) firstError = e;
    }
  });

  // Not "a host that publishes nothing" — a lookup that never ran. Reporting the
  // two the same way is the defect documented in AGENTS.md.
  if (answered === 0) {
    const reason = firstError instanceof Error ? firstError.message : String(firstError);
    throw new Error(`No well-known path could be checked (${unchecked.length} probes failed): ${reason}`);
  }

  // Tri-state. A control probe that THREW proves nothing: treating its failure
  // as "no catch-all" is the same substitution as treating a failed lookup as an
  // empty one, and it would let a JSON catch-all's error documents through as
  // published files.
  const control = await controlPromise;
  const catchAll = control.outcome === "hit";
  if (catchAll) {
    log.warn("probe:catch-all", { url: redactUrlForLog(baseUrl), suppressed: hits.length });
  }
  if (control.outcome === "failed") {
    log.warn("probe:control-unchecked", { url: redactUrlForLog(baseUrl) });
    unchecked.push(CONTROL_PATH);
  }

  hits.sort((a, b) => a.path.localeCompare(b.path));

  const data: WellKnownData = {
    // A host that answers everything has told us nothing about any single path.
    hits: catchAll ? [] : hits,
    probed: paths.length,
    unchecked: unchecked.length > 0 ? unchecked.sort() : undefined,
    catchAll: catchAll || undefined,
    controlUnchecked: control.outcome === "failed" || undefined,
  };

  log.log("probe:complete", { hits: data.hits.length, unchecked: unchecked.length, answered, catchAll });
  return data;
}

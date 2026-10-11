// Everything this extension does that is not a React component.
//
// Plain ESM, no `@raycast/api` import anywhere in here, for one reason: it can
// be run by `node --test` and the components cannot. The commands are thin
// enough that if this file is right, very little is left to be wrong — and a
// front-end nobody can test is a front-end that quietly disagrees with the
// engine, which is the failure this project spends most of its effort avoiding.
//
// It decides nothing about SEO. Levels, grouping, scope lines and every
// threshold come from the engine; this arranges them into rows.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { categoryOf } from '@nurkamol/seo-audit/areas';
import { userAgentFor } from '@nurkamol/seo-audit/agents';

/** The named speeds the macOS app offers, so the two windows mean the same
 *  thing by "Gentle". The numbers live here once. */
export const SPEEDS = { gentle: 1, normal: 6, fast: 12 };

/** A whole number from a text field, or the default. Raycast hands every
 *  preference back as a string, including the ones that are numbers, and
 *  somebody will type a word into one. */
const count = (raw, fallback, ceiling) => {
  const asked = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(asked) && asked > 0 ? Math.min(asked, ceiling) : fallback;
};

/** The most pages a run can crawl inside a Raycast command before its worker
 *  runs out of heap. Exported so the test that pins it can read the number
 *  rather than repeat it. */
export const MAX_PAGES = 40;

/** A comma or newline separated list, trimmed, with the blanks dropped. */
const list = (raw) =>
  (raw ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

/** Everything a run is, from the preferences.
 *
 *  Anything left at its default is **left out** rather than sent explicitly, so
 *  the engine's defaults stay written down in the engine — the same rule the
 *  macOS app's settings follow. An option that is set here is one somebody
 *  chose. */
export function crawlOptions(preferences = {}) {
  const options = {
    // The ceiling is the worker's, not an opinion. A Raycast command gets a
    // 100MB JS heap, and a crawl holds every page it has read until the
    // cross-page checks are done — measured at roughly 0.8MB of live heap per
    // page on a content-heavy site, on top of about 16MB of fixed cost. A
    // hundred pages peaked at 95.6MB live and the command was killed with
    // "Command Out of Memory" before it could report anything.
    //
    // 40 measured at 48MB live on the same site, which leaves room for React,
    // the Raycast API and the finished report in the same heap. 60 was tried
    // first and reached 72MB live — survivable on a good day and not worth
    // shipping a good day as a requirement. The
    // engine itself has no such limit — the terminal and the macOS app run the
    // same crawl with the whole machine behind it, which is what the preference
    // text has always said big sites are for.
    limit: count(preferences.limit, 25, MAX_PAGES),
    concurrency: SPEEDS[preferences.speed] ?? SPEEDS.normal,
    checkExternal: preferences.checkExternal === true,
    // Off unless asked for, like performance. It is one slow lookup to a free
    // third party plus one per candidate host, and a launcher is the worst
    // place of the three to wait out something nobody asked for.
    hosts: preferences.hosts === true,
  };

  const sitemap = (preferences.sitemap ?? '').trim();
  if (sitemap) options.sitemap = sitemap;

  const exclude = list(preferences.exclude);
  if (exclude.length) options.exclude = exclude;

  const since = (preferences.since ?? '').trim();
  if (since) options.since = since;

  const ignore = list(preferences.ignore);
  if (ignore.length) options.ignore = ignore;

  // A string of your own wins over the two menus, and the engine is never left
  // to guess which was meant — the same rule the macOS app applies.
  const own = (preferences.userAgent ?? '').trim();
  if (own) {
    options.userAgent = own;
  } else if (preferences.browser) {
    const chosen = userAgentFor(preferences.browser, preferences.os || undefined);
    if (chosen?.ua) options.userAgent = chosen.ua;
  }

  // Performance is off unless asked for. `/**` is every crawled page, sampled
  // by the engine; `/` is the home page and needs no sample.
  const mode = preferences.performance ?? 'off';
  if (mode !== 'off') {
    options.psi = mode === 'sample' ? ['/**'] : ['/'];
    if (mode === 'sample') options.psiSample = count(preferences.performanceSample, 3, 10);
    options.psiStrategy = preferences.performanceDesktop === true ? 'desktop' : 'mobile';
  }

  // Search Console, off unless asked for. `true` means "the site being
  // audited", which is what the engine does with a bare --search-console; a
  // property is passed through when this is one account covering several sites.
  //
  // The credentials are not asked for here. Getting them opens a browser and
  // writes a file, which is a terminal errand rather than a control in a
  // window — the same answer the macOS app gives. Without them the engine
  // reports `search-console-unconfigured` and names what is missing, so this
  // fails loudly in the report rather than quietly returning nothing.
  if (preferences.searchConsole === true) {
    const property = (preferences.searchConsoleProperty ?? '').trim();
    options.searchConsole = property || true;
  }

  return options;
}

/** What somebody types, as something `audit()` will accept. `null` when it is
 *  not a site — the same rule the macOS app applies, so neither accepts what
 *  the other refuses. */
export function normalise(text) {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes('.') ? url.toString().replace(/\/$/, '') || withScheme : null;
  } catch {
    return null;
  }
}

/**
 * @typedef {{ id: string, title: string, subtitle: string, tone: string }} Row
 * @typedef {{ id: string, title: string, subtitle: string, tone: string,
 *             area: string, pages: string[], checkId: string }} CauseRow
 */

/** A preview, as rows. Refusals come first and say what to do, because a
 *  preview that cannot answer is more useful than one that guesses.
 *  @returns {Row[]} */
export function previewRows(plan) {
  if (!plan) return [];
  if (!plan.reachable) {
    return [{
      id: 'unreachable',
      title: plan.rateLimited ? 'Every request came back HTTP 429' : 'Nothing answered',
      subtitle: plan.rateLimited
        ? 'Wait, or set the speed to Gentle in this extension’s preferences.'
        : `${plan.origin} did not return a single response.`,
      tone: 'error',
    }];
  }

  const rows = [];
  if (!plan.sitemap) {
    rows.push({
      id: 'no-sitemap',
      title: 'No sitemap',
      subtitle: `Links would be followed from the home page instead, up to ${plan.limit} pages.`,
      tone: 'warn',
    });
  } else {
    rows.push({
      id: 'counts',
      title: `${plan.listed.toLocaleString()} URLs listed`,
      subtitle: `${(plan.wouldCheck ?? plan.limit).toLocaleString()} would be checked`
        + (plan.skippedByLimit ? ` · ${plan.skippedByLimit.toLocaleString()} past the limit of ${plan.limit}` : ''),
      tone: plan.skippedByLimit ? 'warn' : 'ok',
    });
    for (const section of plan.sections ?? []) {
      rows.push({
        id: `section:${section.path}`,
        title: section.path,
        subtitle: `${section.count.toLocaleString()} URL${section.count === 1 ? '' : 's'}`,
        tone: 'plain',
      });
    }
  }

  rows.push({
    id: 'cost',
    title: `${plan.requests} requests, ${(plan.ms / 1000).toFixed(1)}s`,
    subtitle: 'No page was fetched. This is what the crawl would do, not the crawl.',
    tone: 'plain',
  });
  return rows;
}

/** The work, worst first — the engine's own ordering, untouched.
 *  @returns {CauseRow[]} */
export function causeRows(report) {
  if (!report?.causes) return [];
  return report.causes.map((cause) => ({
    id: `${cause.id}|${cause.section}`,
    title: cause.title,
    subtitle: cause.scope,
    tone: cause.level,
    // Asked of the engine when the stored report predates `area` travelling
    // with causes. Defaulting to 'Other' threw away something the engine knows:
    // a report kept before 1.24.0 listed every finding under Other, including
    // `no-editorial-links`, which has been in Links the whole time.
    area: cause.area ?? categoryOf(cause.id),
    pages: cause.pages ?? [],
    checkId: cause.id,
  }));
}

/** The one line under a report's title. `ignored` is never left out: a check
 *  somebody silenced must not read the same as one that passed. */
export function summaryLine(report) {
  if (!report?.meta) return '';
  const counts = { error: 0, warn: 0, info: 0 };
  for (const finding of report.findings ?? []) counts[finding.level] = (counts[finding.level] ?? 0) + 1;
  const pages = report.meta.pages ?? 0;
  const findings = (report.findings ?? []).length;
  const causes = (report.causes ?? []).length;
  const parts = [
    `${pages} page${pages === 1 ? '' : 's'}`,
    `${findings} finding${findings === 1 ? '' : 's'}`,
    // "1 things to change" is the sort of thing nobody reports and everybody
    // notices, and the engine's own scope lines get it right.
    `${causes} thing${causes === 1 ? '' : 's'} to change`,
  ];
  if (counts.error) parts.push(`${counts.error} error${counts.error === 1 ? '' : 's'}`);
  if (report.meta.ignored) parts.push(`${report.meta.ignored} silenced`);
  return parts.join(' · ');
}

// --- the score --------------------------------------------------------------
// Every number here is the engine's. `scoreRun()` in src/score.mjs decides what
// a check costs and what applied; this arranges the answer into rows.

/** The score as one accessory-sized string, or `null` when there is none — a
 *  report kept before scoring existed, or a site that never answered. */
export function scoreTag(score) {
  if (!score || typeof score.score !== 'number') return null;
  return `${score.score}/100${score.grade ? ` ${score.grade}` : ''}`;
}

/** The line under a score: what it cost, and what it would be with the errors
 *  cleared. Deliberately says how many checks did not apply — a check nobody
 *  could run must not read as one that passed. */
export function scoreLine(score) {
  if (!score) return '';
  if (typeof score.score !== 'number') return score.why ?? '';
  const parts = [`${score.lost ?? 0} points across ${score.checks?.failed ?? 0} checks`];
  if (score.checks) parts.push(`${score.checks.passed} passed`, `${score.checks.skipped} did not apply`);
  if (typeof score.ifErrorsFixed === 'number' && score.ifErrorsFixed > score.score) {
    parts.push(`errors cleared → ${score.ifErrorsFixed}`);
  }
  return parts.join(' · ');
}

/** What the score gains when one piece of work is done.
 *
 *  A check can be a cause under two sections, and giving each the whole
 *  check's cost would say the site can gain the same points twice. Split by
 *  pages — the same split `causeCost()` makes in src/report.mjs, and the reason
 *  it is written here too is that this file is the only one Raycast can run. */
export function gainFor(cause, score) {
  const check = (score?.failed ?? []).find((row) => row.id === (cause?.checkId ?? cause?.id));
  if (!check) return null;
  const pages = cause?.pages?.length ?? 0;
  const share = check.pages > 0 && pages > 0 ? Math.min(1, pages / check.pages) : 1;
  const points = check.cost * share;
  return points < 0.05 ? null : Math.round(points * 10) / 10;
}

/** Checks that passed, as rows.
 *  @returns {Row[]} */
export function passedRows(score) {
  return (score?.passed ?? []).map((check) => ({
    id: `pass:${check.id}`,
    title: check.pass,
    subtitle: check.area,
    tone: 'ok',
  }));
}

/** Checks that never came up, one row per reason rather than one per check —
 *  "no page declares hreflang" said once over five checks, not five times.
 *  @returns {Row[]} */
export function skippedRows(score) {
  const byReason = new Map();
  for (const check of score?.skipped ?? []) {
    byReason.set(check.why, [...(byReason.get(check.why) ?? []), check.id]);
  }
  // Grouped by reason, so the flag that would fix them travels with the group.
  // Every check under one reason is skipped for that one reason, so they either
  // all become runnable or none of them do.
  const flagFor = new Map();
  for (const check of score?.skipped ?? []) {
    if (check.enabledBy) flagFor.set(check.why, check.enabledBy);
  }

  return [...byReason].map(([why, ids]) => ({
    id: `skip:${ids[0]}`,
    title: why,
    subtitle: ids.join(', '),
    tone: 'plain',
    // The flag that would let this run, when the engine says there is one.
    // Absent for a skip that is a fact about the site rather than a choice
    // about the crawl — there is nothing to press for "no page declares
    // hreflang".
    ...(flagFor.has(why) ? { enabledBy: flagFor.get(why) } : {}),
  }));
}

/** The run options a flag turns on, for a front end offering to run it again.
 *
 *  Only the three the engine says are worth offering, and each one supplies the
 *  value the flag needs rather than asking: `--psi` without targets measures
 *  nothing, so the sampled form is what "measure performance" has to mean here.
 *  A launcher has no good place to ask a follow-up question. */
export function optionsForFlag(flag) {
  switch (flag) {
    case '--check-external': return { checkExternal: true };
    case '--hosts': return { hosts: true };
    case '--psi': return { psi: ['/**'], psiSample: 3, psiStrategy: 'mobile' };
    default: return null;
  }
}

/** The rest of the domain, one row per host.
 *
 *  The hosts a finding is about are marked from the findings themselves rather
 *  than worked out again here — the engine decided what counts as a leaked
 *  staging copy, and a second opinion in a launcher would be a second answer to
 *  the same question.
 *  @returns {Row[]} */
export function hostRows(meta, findings = []) {
  const inventory = meta?.hosts;
  if (!inventory?.rows?.length) return [];

  const flagged = new Map();
  for (const finding of findings) {
    if (!/^(subdomain-takeover|staging-indexable|duplicate-host)$/.test(finding.id)) continue;
    try {
      const host = new URL(finding.url).hostname;
      if (finding.level === 'error' || !flagged.has(host)) flagged.set(host, finding.level);
    } catch { /* a finding without a parseable URL marks nothing */ }
  }

  return inventory.rows.map((row) => ({
    id: `host:${row.host}`,
    title: row.host,
    subtitle: hostLine(row),
    tone: flagged.get(row.host) === 'error' ? 'error' : flagged.has(row.host) ? 'warn' : 'plain',
  }));
}

/** What a host row says about itself, in one line — the same sentence the
 *  terminal, the HTML and the macOS window print. */
export function hostLine(row) {
  if (row.dangling) return `CNAME → ${row.cname} (gone)`;
  if (!row.addresses.length) return row.cname ? `CNAME → ${row.cname}` : 'does not resolve';
  const where = row.addresses[0];
  if (!row.checked) return `${where} · not fetched`;
  if (row.redirectsHome) return `${where} · ${row.status} → the canonical host`;
  if (row.noindex) return `${where} · ${row.status}, noindex`;
  if (!row.status) return `${where} · no answer`;
  return `${where} · ${row.status}${row.title ? `  ${row.title}` : ''}`;
}

// --- what the macOS app has already kept -----------------------------------

/** The folder both front-ends use. Named for the bundle id rather than the
 *  display name, which is what `Support.directory()` does on the Swift side. */
export const libraryRoot = (root) =>
  root ?? join(homedir(), 'Library', 'Application Support', 'seo-audit');

/** Runs the macOS app has kept, newest first.
 *
 *  A row whose file has gone is dropped rather than listed: an entry that opens
 *  onto nothing is worse than no entry, and a folder can be emptied by a sync
 *  tool without the index being told. */
export function keptReports(root) {
  const base = libraryRoot(root);
  const index = join(base, 'index.json');
  if (!existsSync(index)) return [];

  let rows;
  try {
    rows = JSON.parse(readFileSync(index, 'utf8'));
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row) => row && typeof row.id === 'string' && existsSync(join(base, 'reports', `${row.id}.json`)))
    .map((row) => ({
      ...row,
      path: join(base, 'reports', `${row.id}.json`),
      when: new Date(row.finishedAt),
    }))
    .sort((a, b) => b.when - a.when);
}

/** One kept report, read back exactly as the engine wrote it. */
export function readReport(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** Whether the macOS app is installed, so a row can offer to open there. */
export const appIsInstalled = () =>
  ['/Applications/SEO Audit.app', join(homedir(), 'Applications', 'SEO Audit.app')]
    .some((path) => existsSync(path));

/** Used by the tests to prove a stray file in the folder is not a report. */
export const reportFiles = (root) => {
  const folder = join(libraryRoot(root), 'reports');
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')) : [];
};

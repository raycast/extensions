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
    limit: count(preferences.limit, 25, 5000),
    concurrency: SPEEDS[preferences.speed] ?? SPEEDS.normal,
    checkExternal: preferences.checkExternal === true,
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

// Writing a report out, in whatever shape somebody needs it.
//
// This owns none of these formats. `html()`, `markdown()` and `csv()` are the
// same writers the command line calls for `--html`, `--md` and `--csv`, and the
// corrected sitemap is whatever `--write-sitemap` produced during the run. A
// file exported from a launcher and one written by `seo-audit --csv` are the
// same file, which is the rule that lets this project have four front ends.
//
// Plain ESM with no `@raycast/api` import, like the rest of `lib/`, so
// `node --test` can run it.

import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { html, markdown, csv } from '@nurkamol/seo-audit/report';

/** What a report can be written as, in the order somebody wants them. */
export const FORMATS = [
  { id: 'html', label: 'HTML report', extension: 'html',
    detail: 'The full report, one file, opens in any browser.' },
  { id: 'markdown', label: 'Markdown', extension: 'md',
    detail: 'For committing, or pasting into a ticket.' },
  { id: 'csv', label: 'Spreadsheet (CSV)', extension: 'csv',
    detail: 'One row per finding. For sorting and filtering.' },
  { id: 'json', label: 'JSON', extension: 'json',
    detail: 'Everything, exactly as the engine produced it.' },
  { id: 'sitemap', label: 'Corrected sitemap', extension: 'xml',
    detail: 'The sitemap this site should have had.' },
];

/** A file name somebody can find again, and that sorts. */
export function filenameFor(format, host, at = new Date()) {
  const spec = FORMATS.find((f) => f.id === format);
  const stamp = at.toISOString().slice(0, 10);
  const safe = (host || 'report').replace(/[^a-z0-9.-]+/gi, '-');
  return `seo-audit-${safe}-${stamp}.${spec?.extension ?? 'txt'}`;
}

/** The report as text, or `null` when there is nothing to write.
 *
 *  The sitemap is the one that can legitimately be nothing: the engine refuses
 *  to build one from a crawl that did not see the whole site, because a sitemap
 *  missing real pages is worse than one listing dead ones. That refusal is
 *  carried, not swallowed. */
export function render(format, report) {
  if (!report?.meta) return { text: null, refused: 'There is no report to write.' };

  switch (format) {
    case 'html':
      return { text: html(report.findings ?? [], report.meta), refused: null };
    case 'markdown':
      return { text: markdown(report.findings ?? [], report.meta), refused: null };
    case 'csv':
      return { text: csv(report.findings ?? [], report.meta), refused: null };
    case 'json':
      return { text: JSON.stringify(report, null, 2), refused: null };
    case 'sitemap':
      if (!report.sitemap) {
        return { text: null, refused: 'This run did not build one.' };
      }
      return {
        text: report.sitemap.xml,
        refused: report.sitemap.xml ? null : report.sitemap.refused,
      };
    default:
      return { text: null, refused: `Unknown format "${format}".` };
  }
}

/** Write it where somebody will look for it. Returns the path, or the reason
 *  there is no path. */
export function writeReport(format, report, host, { directory = join(homedir(), 'Downloads') } = {}) {
  const { text, refused } = render(format, report);
  if (!text) return { path: null, refused };

  const path = join(directory, filenameFor(format, host));
  try {
    writeFileSync(path, text);
  } catch (error) {
    return { path: null, refused: `Could not write it: ${error.message}` };
  }
  return { path, refused: null };
}

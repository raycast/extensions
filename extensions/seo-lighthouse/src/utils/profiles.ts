import type { LighthouseReport } from './lighthouse';
import { escapeMarkdownCell, isFailed } from './report';

export const REPORT_PROFILES = {
  general: {
    title: 'General',
    focus: 'Balanced overview of quality, usability, and technical health.',
    categories: ['performance', 'accessibility', 'best-practices', 'seo'],
    metrics: [
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'first-contentful-paint',
    ],
    checks: [
      'is-crawlable',
      'document-title',
      'meta-description',
      'color-contrast',
    ],
  },
  marketing: {
    title: 'Marketing',
    focus:
      'Landing-page experience, discoverability, and accessibility. Lighthouse does not measure conversions, revenue, or campaign ROI.',
    categories: ['seo', 'performance', 'accessibility', 'best-practices'],
    metrics: [
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'first-contentful-paint',
    ],
    checks: [
      'is-crawlable',
      'document-title',
      'meta-description',
      'link-text',
      'image-alt',
      'color-contrast',
    ],
  },
  seo: {
    title: 'SEO',
    focus:
      'Crawlability, metadata checks, and page experience. These checks do not confirm indexing or rankings.',
    categories: ['seo', 'best-practices', 'performance', 'accessibility'],
    metrics: [
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'server-response-time',
    ],
    checks: [
      'is-crawlable',
      'robots-txt',
      'canonical',
      'hreflang',
      'document-title',
      'meta-description',
      'http-status-code',
      'structured-data',
    ],
  },
  developer: {
    title: 'Development',
    focus:
      'Rendering bottlenecks, JavaScript cost, network overhead, and actionable implementation evidence.',
    categories: ['performance', 'best-practices', 'accessibility', 'seo'],
    metrics: [
      'total-blocking-time',
      'largest-contentful-paint',
      'first-contentful-paint',
      'cumulative-layout-shift',
      'server-response-time',
      'speed-index',
    ],
    checks: [
      'render-blocking-insight',
      'unused-javascript',
      'unused-css-rules',
      'mainthread-work-breakdown',
      'total-byte-weight',
      'errors-in-console',
    ],
  },
} as const;

export type ReportProfile = keyof typeof REPORT_PROFILES;
export function normalizeProfile(value?: string): ReportProfile {
  return value && Object.prototype.hasOwnProperty.call(REPORT_PROFILES, value)
    ? (value as ReportProfile)
    : 'general';
}

export function profileSummary(
  report: LighthouseReport,
  profile: ReportProfile
): string {
  const config = REPORT_PROFILES[profile];
  const rows = config.checks.map(id => {
    const audit = report.audits?.[id];
    const state = !audit
      ? 'Not measured'
      : audit.scoreDisplayMode === 'error'
        ? 'Audit error'
        : audit.scoreDisplayMode === 'manual'
          ? 'Manual review required'
          : audit.scoreDisplayMode === 'notApplicable'
            ? 'Not applicable'
            : audit.score == null
              ? 'Informational / unscored'
              : isFailed(audit)
                ? 'Needs attention'
                : 'Good';
    return (
      '| ' +
      escapeMarkdownCell(audit?.title || id) +
      ' | ' +
      state +
      ' | ' +
      escapeMarkdownCell(audit?.displayValue) +
      ' |'
    );
  });
  return (
    '## ' +
    config.title +
    ' Focus\n\n' +
    config.focus +
    '\n\n| Check | Status | Result |\n| :--- | :--- | :--- |\n' +
    rows.join('\n') +
    '\n\n'
  );
}

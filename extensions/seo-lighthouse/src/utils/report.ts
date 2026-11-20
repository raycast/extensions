import type { LighthouseReport } from './lighthouse';

export function formatEvidence(details: unknown): string {
  if (!details || typeof details !== 'object') return '';
  const data = details as Record<string, unknown>;
  const cell = (value: unknown): string => {
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>;
      value =
        item.snippet ||
        item.selector ||
        item.url ||
        item.value ||
        JSON.stringify(value);
    }
    return escapeMarkdownCell(String(value ?? '—'))
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  if (
    data.type === 'table' &&
    Array.isArray(data.headings) &&
    Array.isArray(data.items)
  ) {
    const headings = data.headings
      .filter(h => h && typeof h.key === 'string')
      .slice(0, 4);
    if (headings.length) {
      const rows = data.items
        .slice(0, 15)
        .map(
          item =>
            '| ' + headings.map(h => cell(item?.[h.key])).join(' | ') + ' |'
        );
      return (
        '## Evidence\n\n| ' +
        headings.map(h => cell(h.label || h.key)).join(' | ') +
        ' |\n|' +
        headings.map(() => ' --- ').join('|') +
        '|\n' +
        rows.join('\n') +
        (data.items.length > 15
          ? '\n\n_First 15 items shown. Full evidence is in the JSON report._'
          : '')
      );
    }
  }
  const raw = JSON.stringify(details, null, 2);
  return (
    '## Evidence\n\n~~~~json\n' +
    raw.slice(0, 12000) +
    '\n~~~~' +
    (raw.length > 12000 ? '\n\n_Preview truncated; see the JSON report._' : '')
  );
}

export function getAuditScore(
  audit: { score?: number | null } | undefined
): number {
  if (!audit || audit.score === null || audit.score === undefined) return 0;
  return audit.score;
}

export function isFailed(
  audit: { score?: number | null } | undefined
): boolean {
  if (!audit || audit.score === null || audit.score === undefined) return false;
  return audit.score < 0.9;
}

export function isCritical(
  audit: { score?: number | null } | undefined
): boolean {
  if (!audit || audit.score === null || audit.score === undefined) return false;
  return audit.score < 0.5;
}

export function formatScore(score: number | undefined | null): string {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score * 100)}`;
}

export function formatRating(score?: number | null): string {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 0.9) return 'good';
  if (score >= 0.5) return 'medium';
  return 'poor';
}

export function getStatusIcon(score: number | null | undefined): string {
  if (score === null || score === undefined) return '⚪️';
  if (score >= 0.9) return '🟢';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

export interface OpportunityInfo {
  id: string;
  title?: string;
  displayValue?: string;
  score?: number | null;
  savingsMs?: number;
  savingsBytes?: number;
  itemCount: number;
  exampleUrl?: string;
}

export function extractOpportunities(
  report: LighthouseReport,
  maxCount = 5
): OpportunityInfo[] {
  return Object.values(report.audits || {})
    .filter(
      a =>
        (a.details?.type === 'opportunity' || a.id.endsWith('-insight')) &&
        (isFailed(a) ||
          Object.values(a.metricSavings || {}).some(
            value => typeof value === 'number' && value > 0
          ))
    )
    .map(op => {
      const items = Array.isArray(op.details?.items) ? op.details.items : [];
      const firstUrl = items.find(item => item?.url)?.url;
      return {
        id: op.id,
        title: op.title,
        displayValue: op.displayValue,
        score: op.score,
        savingsMs:
          op.details?.overallSavingsMs ??
          Math.max(
            0,
            ...['LCP', 'FCP', 'INP', 'TBT'].map(key => {
              const value = op.metricSavings?.[key];
              return typeof value === 'number' && Number.isFinite(value)
                ? value
                : 0;
            })
          ),
        savingsBytes: op.details?.overallSavingsBytes,
        itemCount: items.length,
        exampleUrl: firstUrl,
      };
    })
    .sort((a, b) => (b.savingsMs || 0) - (a.savingsMs || 0))
    .slice(0, maxCount);
}

export function formatSavings(op: OpportunityInfo): string {
  const { savingsMs, savingsBytes } = op;
  if (!savingsMs && !savingsBytes) return '-';
  const parts: string[] = [];
  if (savingsMs) parts.push(`${Math.round(savingsMs)} ms`);
  if (savingsBytes) parts.push(`${Math.round(savingsBytes / 1024)} KB`);
  return parts.join(' · ');
}

export function escapeMarkdownCell(text: string | undefined | null): string {
  if (!text) return '-';
  return String(text)
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, 200);
}

export interface FailedAuditInfo {
  id: string;
  title?: string;
  score?: number | null;
}

export function extractFailedAudits(
  report: LighthouseReport,
  maxCount = 5
): FailedAuditInfo[] {
  return Object.values(report.audits || {})
    .filter(a => isCritical(a))
    .filter(a => a.title)
    .sort((a, b) => getAuditScore(a) - getAuditScore(b))
    .slice(0, maxCount)
    .map(a => ({ id: a.id, title: a.title, score: a.score }));
}

export interface SeoFieldInfo {
  id: string;
  label: string;
  displayValue?: string;
  score?: number | null;
  structuredDataTypes?: string[];
}

const SEO_FIELD_DEFS = [
  { id: 'document-title', label: 'Title Tag' },
  { id: 'meta-description', label: 'Meta Description' },
  { id: 'canonical', label: 'Canonical URL' },
  { id: 'html-has-lang', label: 'HTML Lang Attribute' },
  { id: 'structured-data', label: 'Structured Data' },
] as const;

export function extractSeoFields(report: LighthouseReport): SeoFieldInfo[] {
  return SEO_FIELD_DEFS.map(f => {
    const audit = report.audits?.[f.id];
    const structuredDataTypes =
      f.id === 'structured-data'
        ? (audit?.details?.items || [])
            .map(item => item?.type || item?.name)
            .filter((value): value is string => typeof value === 'string')
        : undefined;
    return {
      id: f.id,
      label: f.label,
      displayValue: audit?.displayValue,
      score: audit?.score,
      structuredDataTypes,
    };
  }).filter(f => f.displayValue !== undefined || f.score !== undefined);
}

export interface VitalInfo {
  value?: string;
  rating: string;
}

export function extractVitals(
  report: LighthouseReport
): Record<string, VitalInfo> {
  const pick = (id: string) => report.audits?.[id];
  return {
    lcp: {
      value: pick('largest-contentful-paint')?.displayValue,
      rating: formatRating(pick('largest-contentful-paint')?.score),
    },
    inp: {
      value: pick('interaction-to-next-paint')?.displayValue,
      rating: formatRating(pick('interaction-to-next-paint')?.score),
    },
    tbt: {
      value: pick('total-blocking-time')?.displayValue,
      rating: formatRating(pick('total-blocking-time')?.score),
    },
    cls: {
      value: pick('cumulative-layout-shift')?.displayValue,
      rating: formatRating(pick('cumulative-layout-shift')?.score),
    },
    ttfb: {
      value: pick('server-response-time')?.displayValue,
      rating: formatRating(pick('server-response-time')?.score),
    },
    fcp: {
      value: pick('first-contentful-paint')?.displayValue,
      rating: formatRating(pick('first-contentful-paint')?.score),
    },
    speedIndex: {
      value: pick('speed-index')?.displayValue,
      rating: formatRating(pick('speed-index')?.score),
    },
  };
}

export interface CategoryScoreInfo {
  key: string;
  name: string;
  score: number;
}

const CATEGORY_NAMES: Record<string, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  seo: 'SEO',
  pwa: 'PWA',
};

export function getCategoryLabel(key: string): string {
  return CATEGORY_NAMES[key] || key;
}

export function extractCategoryScores(
  report: LighthouseReport
): CategoryScoreInfo[] {
  return Object.entries(report.categories || {})
    .map(([key, value]) => ({
      key,
      name: getCategoryLabel(key),
      score: getAuditScore(value),
    }))
    .sort((a, b) => a.score - b.score);
}

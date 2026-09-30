import type { LighthouseReport } from './lighthouse';
import {
  getCategoryLabel,
  formatSavings,
  type OpportunityInfo,
} from './report';
import { REPORT_PROFILES, type ReportProfile } from './profiles';
import { FONT, scoreColor, svg, theme, xml } from './svg';

export const DASHBOARD_W = 560;

const VITAL_DEFS = [
  { id: 'largest-contentful-paint', label: 'LCP' },
  { id: 'interaction-to-next-paint', label: 'INP' },
  { id: 'total-blocking-time', label: 'TBT' },
  { id: 'first-contentful-paint', label: 'FCP' },
  { id: 'cumulative-layout-shift', label: 'CLS' },
  { id: 'server-response-time', label: 'TTFB' },
  { id: 'speed-index', label: 'Speed Index' },
] as const;

type ScoreItem = { name: string; score: number | null };
type VitalItem = { label: string; value: string; score: number | null };

function scoreGauge(item: ScoreItem, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2 - 8;
  const r = Math.min(w, h) * 0.3;
  const stroke = 11;
  const circ = 2 * Math.PI * r;
  const score = Math.min(Math.max(item.score ?? 0, 0), 1);
  const color = item.score == null ? theme.muted : scoreColor(score);
  const value = item.score == null ? 'N/A' : Math.round(score * 100);
  const offset = circ * (1 - Math.max(score, 0.001));

  return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${theme.track}" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx.toFixed(1)} ${cy.toFixed(1)})"/>
    <text x="${cx}" y="${(cy + 11).toFixed(1)}" text-anchor="middle" ${FONT} font-size="34" font-weight="700" fill="${theme.text}">${value}</text>
    <text x="${cx}" y="${(cy + r + 26).toFixed(1)}" text-anchor="middle" ${FONT} font-size="12" font-weight="600" fill="${theme.muted}">${xml(item.name)}</text>`;
}

function gaugesGrid(scores: ScoreItem[]): { body: string; height: number } {
  if (scores.length === 0) return { body: '', height: 0 };

  const n = scores.length;
  const cols = Math.min(n, 4);
  const rows = Math.ceil(n / cols);
  const gap = 12;
  const cellW = (DASHBOARD_W - gap * (cols - 1)) / cols;
  const cellH = 144;

  const body = scores
    .map((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellW + gap);
      const y = row * (cellH + gap);
      return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><rect width="${cellW}" height="${cellH}" rx="16" fill="${theme.card}"/>${scoreGauge(item, cellW, cellH)}</g>`;
    })
    .join('');

  return {
    body,
    height: rows * cellH + (rows - 1) * gap,
  };
}

export function opportunityCardSvg(op: OpportunityInfo, index: number): string {
  // Rank reflects the extractor's estimated-time-savings order, not severity.
  const color =
    index === 0 ? theme.bad : index < 3 ? theme.average : theme.accent;
  const label =
    index === 0 ? 'START HERE' : index < 3 ? 'UP NEXT' : 'ALSO REVIEW';
  const title = (op.title || op.id).replace(/\s+/g, ' ').trim();
  const chunks = title.match(/.{1,52}(?:\s|$)|.{1,52}/g) || [title];
  const lines = chunks.slice(0, 3).map(line => line.trim());
  if (chunks.length > 3) lines[2] = lines[2].slice(0, 49) + '…';
  const titleSvg = lines
    .map(
      (line, i) =>
        `<text x="64" y="${64 + i * 21}" ${FONT} font-size="16" font-weight="600" fill="${theme.text}">${xml(line)}</text>`
    )
    .join('');
  const footerY = 84 + (lines.length - 1) * 21;
  const savings = formatSavings(op);
  const detail =
    savings === '-'
      ? 'Savings not quantified'
      : 'Potential savings: ' + savings;
  const items =
    op.itemCount > 0
      ? op.itemCount + ' evidence items'
      : 'Inspect audit evidence';
  return svg(
    DASHBOARD_W,
    footerY + 44,
    `
    <rect x="1" y="1" width="558" height="${footerY + 42}" rx="16" fill="${theme.card}" stroke="${theme.track}"/>
    <rect x="1" y="17" width="3" height="${footerY + 10}" rx="1.5" fill="${color}"/>
    <circle cx="31" cy="31" r="17" fill="${color}" fill-opacity=".13"/>
    <text x="31" y="36" text-anchor="middle" font-family="Menlo, monospace" font-size="13" font-weight="700" fill="${color}">${String(index + 1).padStart(2, '0')}</text>
    <path d="M65 32l4-5 4 5m-8-7 4-5 4 5" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="83" y="31" ${FONT} font-size="10" letter-spacing="1.2" font-weight="700" fill="${color}">${label}</text>
    ${titleSvg}
    <text x="64" y="${footerY + 3}" font-family="Menlo, monospace" font-size="12" font-weight="600" fill="${color}">${xml(detail)}</text>
    <text x="64" y="${footerY + 23}" ${FONT} font-size="11" fill="${theme.muted}">${xml(items)} · Explore Audits ⌘D</text>
  `
  );
}

function metricIcon(label: string): string {
  if (label === 'CLS')
    return '<path d="M3 3h7v7H3zM14 14h7v7h-7zM14 3h7M21 3v7M3 14v7h7"/>';
  if (label === 'TBT' || label === 'INP')
    return '<path d="M13 2 4 14h7l-1 8 10-12h-7z"/>';
  if (label === 'TTFB')
    return '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M6 6h1M6 17h1"/>';
  return '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>';
}

function vitalsCard(
  vitals: VitalItem[],
  y: number
): { body: string; height: number } {
  if (!vitals.length) return { body: '', height: 0 };
  const gap = 12;
  const width = (DASHBOARD_W - gap) / 2;
  const cellH = 112;
  const rows = vitals
    .map((v, i) => {
      const x = (i % 2) * (width + gap);
      const top = 28 + Math.floor(i / 2) * (cellH + gap);
      const score = v.score == null ? null : Math.min(1, Math.max(0, v.score));
      const color = score == null ? theme.muted : scoreColor(score);
      const state =
        score == null
          ? 'Unscored'
          : score >= 0.9
            ? 'Good'
            : score >= 0.5
              ? 'Needs work'
              : 'Poor';
      const value = v.value.length > 32 ? v.value.slice(0, 31) + '…' : v.value;
      const fontSize = value.length > 20 ? 13 : value.length > 12 ? 18 : 28;
      const segments = Array.from({ length: 20 }, (_, index) => {
        const active = score != null && index < Math.round(score * 20);
        return `<rect x="${16 + index * ((width - 32) / 20)}" y="87" width="${(width - 32) / 20 - 3}" height="5" rx="2" fill="${active ? color : theme.track}"/>`;
      }).join('');
      return `<g transform="translate(${x},${top})">
      <rect width="${width}" height="${cellH}" rx="14" fill="${theme.card}"/>
      <g transform="translate(15,13) scale(.7)" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${metricIcon(v.label)}</g>
      <text x="40" y="27" ${FONT} font-size="12" font-weight="600" fill="${theme.muted}">${xml(v.label)}</text>
      <text x="${width - 16}" y="27" text-anchor="end" ${FONT} font-size="11" fill="${color}">${state}</text>
      <text x="16" y="66" ${FONT} font-size="${fontSize}" font-weight="700" fill="${theme.text}">${xml(value)}</text>
      ${segments}
    </g>`;
    })
    .join('');
  return {
    body: `<g transform="translate(0,${y})"><text x="0" y="14" ${FONT} font-size="11" font-weight="600" fill="${theme.muted}">LAB METRICS · BARS SHOW LIGHTHOUSE SCORE, NOT DURATION</text>${rows}</g>`,
    height: 28 + Math.ceil(vitals.length / 2) * (cellH + gap) - gap,
  };
}

function auditDistribution(report: LighthouseReport): string {
  const counts = [0, 0, 0, 0];
  for (const audit of Object.values(report.audits || {})) {
    if (audit.scoreDisplayMode === 'error') counts[3]++;
    else if (typeof audit.score !== 'number' || !Number.isFinite(audit.score))
      counts[2]++;
    else if (audit.score === 1) counts[0]++;
    else counts[1]++;
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  const labels = ['Passed', 'Below 100', 'Unscored / N/A', 'Errors'];
  const colors = [theme.good, theme.average, theme.muted, theme.bad];
  let x = 16;
  const bars = counts
    .map((count, i) => {
      const width = total ? (count / total) * (DASHBOARD_W - 32) : 0;
      const result = width
        ? `<rect x="${x}" y="72" width="${width}" height="6" fill="${colors[i]}"/>`
        : '';
      x += width;
      return result;
    })
    .join('');
  const labelsSvg = counts
    .map(
      (count, i) =>
        `<circle cx="${20 + i * 136}" cy="29" r="3" fill="${colors[i]}"/><text x="${30 + i * 136}" y="33" ${FONT} font-size="11" fill="${theme.muted}">${labels[i]}</text><text x="${16 + i * 136}" y="59" ${FONT} font-size="21" font-weight="700" fill="${theme.text}">${count}</text>`
    )
    .join('');
  return `<rect width="${DASHBOARD_W}" height="94" rx="14" fill="${theme.card}"/>${labelsSvg}${bars}`;
}

export function reportDashboardSvg(opts: {
  hostname: string;
  device: string;
  fromCache: boolean;
  scores: ScoreItem[];
  vitals: VitalItem[];
  distribution?: string;
  profileTitle?: string;
}): string {
  const headerH = 56;
  const gapY = 14;
  const gauges = gaugesGrid(opts.scores);
  const vitalsY = headerH + gauges.height + (gauges.height ? gapY : 0);
  const vitals = vitalsCard(opts.vitals, vitalsY);
  const distributionY = Math.max(vitalsY + vitals.height, headerH + 40) + 14;
  const height = distributionY + (opts.distribution ? 94 : 0);

  const cache = opts.fromCache ? ' · cache' : '';
  const host = xml(
    opts.hostname.length > 30 ? opts.hostname.slice(0, 29) + '…' : opts.hostname
  );
  const meta = xml(`${opts.device}${cache}`);

  const header = `<text x="0" y="18" ${FONT} font-size="16" font-weight="700" fill="${theme.text}">${host}</text>
    <text x="${DASHBOARD_W}" y="18" text-anchor="end" ${FONT} font-size="13" fill="${theme.muted}">${meta}</text><text x="0" y="40" ${FONT} font-size="11" font-weight="600" fill="${theme.accent}">${xml(opts.profileTitle || 'General').toUpperCase()} · AUDIT OVERVIEW</text>`;

  const gaugesBody = gauges.body
    ? `<g transform="translate(0,${headerH})">${gauges.body}</g>`
    : '';

  return svg(
    DASHBOARD_W,
    height,
    `${header}${gaugesBody}${vitals.body}<g transform="translate(0,${distributionY})">${opts.distribution || ''}</g>`
  );
}

export function buildScorecard(
  report: LighthouseReport,
  hostname: string,
  fromCache: boolean,
  profile: ReportProfile = 'general'
): string {
  const config = REPORT_PROFILES[profile];
  const scores = [...config.categories, 'pwa'].flatMap(key => {
    const cat = report.categories?.[key];
    if (!cat) return [];
    return [
      {
        name: getCategoryLabel(key),
        score:
          typeof cat.score === 'number' && Number.isFinite(cat.score)
            ? cat.score
            : null,
      },
    ];
  });

  const vitals = config.metrics.flatMap(id => {
    const def = VITAL_DEFS.find(item => item.id === id);
    if (!def) return [];
    const audit = report.audits?.[def.id];
    const value = audit?.displayValue;
    if (!value) return [];
    return [
      {
        label: def.label,
        value,
        score:
          typeof audit?.score === 'number' && Number.isFinite(audit.score)
            ? audit.score
            : null,
      },
    ];
  });

  const device =
    report.configSettings?.formFactor === 'desktop' ? 'Desktop' : 'Mobile';

  return reportDashboardSvg({
    hostname,
    device,
    fromCache,
    scores,
    vitals,
    distribution: auditDistribution(report),
    profileTitle: config.title,
  });
}

export function loadingDashboardSvg(opts: {
  hostname: string;
  progress: number;
  phase: string;
}): string {
  const w = DASHBOARD_W;
  const h = 280;
  const cx = w / 2;
  const cy = 132;
  const r = 78;
  const stroke = 12;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(opts.progress, 0), 100);
  const fraction = Math.max(pct / 100, 0.004);
  const offset = circ * (1 - fraction);
  const host = xml(opts.hostname.slice(0, 42));
  const phase = xml(opts.phase);

  return svg(
    w,
    h,
    `<text x="${cx}" y="28" text-anchor="middle" ${FONT} font-size="15" font-weight="600" fill="${theme.muted}">${host}</text>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.track}" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.accent}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" ${FONT} font-size="42" font-weight="700" fill="${theme.text}">${Math.round(pct)}</text>
    <text x="${cx}" y="${cy + 36}" text-anchor="middle" ${FONT} font-size="13" fill="${theme.muted}">%</text>
    <text x="${cx}" y="${h - 24}" text-anchor="middle" ${FONT} font-size="14" font-weight="600" fill="${theme.accent}">${phase}</text>`
  );
}

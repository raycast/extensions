import type { LighthouseReport } from './lighthouse';
import { getAuditScore, getCategoryLabel } from './report';
import { FONT, scoreColor, svg, theme, xml } from './svg';

export const DASHBOARD_W = 560;

const CATEGORY_ORDER = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
  'pwa',
] as const;

const VITAL_DEFS = [
  { id: 'largest-contentful-paint', label: 'LCP' },
  { id: 'interaction-to-next-paint', label: 'INP' },
  { id: 'total-blocking-time', label: 'TBT' },
  { id: 'first-contentful-paint', label: 'FCP' },
  { id: 'cumulative-layout-shift', label: 'CLS' },
  { id: 'server-response-time', label: 'TTFB' },
  { id: 'speed-index', label: 'Speed Index' },
] as const;

type ScoreItem = { name: string; score: number };
type VitalItem = { label: string; value: string; score: number };

function scoreGauge(item: ScoreItem, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2 - 8;
  const r = Math.min(w, h) * 0.3;
  const stroke = 11;
  const circ = 2 * Math.PI * r;
  const score = Math.min(Math.max(item.score, 0), 1);
  const color = scoreColor(score);
  const value = Math.round(score * 100);
  const offset = circ * (1 - Math.max(score, 0.001));

  return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${theme.track}" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx.toFixed(1)} ${cy.toFixed(1)})"/>
    <text x="${cx}" y="${(cy + 11).toFixed(1)}" text-anchor="middle" ${FONT} font-size="34" font-weight="700" fill="${theme.text}">${value}</text>
    <text x="${cx}" y="${(cy + r + 26).toFixed(1)}" text-anchor="middle" ${FONT} font-size="12" font-weight="600" fill="${theme.muted}">${xml(item.name)}</text>`;
}

function gaugesGrid(scores: ScoreItem[]): { body: string; height: number } {
  if (scores.length === 0) return { body: '', height: 0 };

  const n = scores.length;
  const cols = n <= 2 ? n : n === 3 ? 3 : 2;
  const rows = Math.ceil(n / cols);
  const gap = 12;
  const cellW = (DASHBOARD_W - gap * (cols - 1)) / cols;
  const cellH = n === 1 ? 240 : 188;

  const body = scores
    .map((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellW + gap);
      const y = row * (cellH + gap);
      return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${scoreGauge(item, cellW, cellH)}</g>`;
    })
    .join('');

  return {
    body,
    height: rows * cellH + (rows - 1) * gap,
  };
}

function vitalsCard(
  vitals: VitalItem[],
  y: number
): { body: string; height: number } {
  if (vitals.length === 0) return { body: '', height: 0 };

  const pad = 16;
  const rowH = 34;
  const h = pad * 2 + 20 + vitals.length * rowH;
  const barX = 118;
  const barW = 300;
  const barH = 10;

  const rows = vitals
    .map((v, i) => {
      const rowY = pad + 26 + i * rowH;
      const score = Math.min(Math.max(v.score, 0), 1);
      const fill = Math.max(score * barW, score > 0 ? 6 : 0);
      const color = scoreColor(score);
      return `<text x="${pad}" y="${rowY + 12}" ${FONT} font-size="13" font-weight="600" fill="${theme.muted}">${xml(v.label)}</text>
        <rect x="${barX}" y="${rowY + 4}" width="${barW}" height="${barH}" rx="5" fill="${theme.track}"/>
        <rect x="${barX}" y="${rowY + 4}" width="${fill.toFixed(1)}" height="${barH}" rx="5" fill="${color}"/>
        <text x="${DASHBOARD_W - pad}" y="${rowY + 13}" text-anchor="end" ${FONT} font-size="13" font-weight="600" fill="${theme.text}">${xml(v.value)}</text>`;
    })
    .join('');

  const body = `<g transform="translate(0,${y})">
    <rect width="${DASHBOARD_W}" height="${h}" rx="12" fill="${theme.card}"/>
    <text x="${pad}" y="${pad + 12}" ${FONT} font-size="12" font-weight="600" fill="${theme.muted}">Core Web Vitals</text>
    ${rows}
  </g>`;

  return { body, height: h };
}

export function reportDashboardSvg(opts: {
  hostname: string;
  device: string;
  fromCache: boolean;
  scores: ScoreItem[];
  vitals: VitalItem[];
}): string {
  const headerH = 28;
  const gapY = 14;
  const gauges = gaugesGrid(opts.scores);
  const vitalsY = headerH + gauges.height + (gauges.height ? gapY : 0);
  const vitals = vitalsCard(opts.vitals, vitalsY);
  const height = Math.max(vitalsY + vitals.height, headerH + 40);

  const cache = opts.fromCache ? ' · cache' : '';
  const host = xml(opts.hostname.slice(0, 42));
  const meta = xml(`${opts.device}${cache}`);

  const header = `<text x="0" y="18" ${FONT} font-size="16" font-weight="700" fill="${theme.text}">${host}</text>
    <text x="${DASHBOARD_W}" y="18" text-anchor="end" ${FONT} font-size="13" fill="${theme.muted}">${meta}</text>`;

  const gaugesBody = gauges.body
    ? `<g transform="translate(0,${headerH})">${gauges.body}</g>`
    : '';

  return svg(DASHBOARD_W, height, `${header}${gaugesBody}${vitals.body}`);
}

export function buildScorecard(
  report: LighthouseReport,
  hostname: string,
  fromCache: boolean
): string {
  const scores = CATEGORY_ORDER.flatMap(key => {
    const cat = report.categories?.[key];
    if (!cat) return [];
    return [{ name: getCategoryLabel(key), score: getAuditScore(cat) }];
  });

  const vitals = VITAL_DEFS.flatMap(def => {
    const audit = report.audits?.[def.id];
    const value = audit?.displayValue;
    if (!value) return [];
    return [
      {
        label: def.label,
        value,
        score: getAuditScore(audit),
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

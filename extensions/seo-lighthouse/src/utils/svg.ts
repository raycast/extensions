import { environment } from '@raycast/api';

// Raycast renders markdown images once; CSS prefers-color-scheme inside the
// SVG is ignored, so the palette is resolved from environment.appearance.
const isDark = environment.appearance === 'dark';

const accents = isDark
  ? {
      red: '#F84E4E',
      yellow: '#FFCC47',
      green: '#4EF8A7',
      blue: '#228CF6',
    }
  : {
      red: '#F50A0A',
      yellow: '#E0A200',
      green: '#07BA65',
      blue: '#0A7FF5',
    };

export const theme = {
  isDark,
  text: isDark ? '#ffffff' : '#1a1a1a',
  muted: isDark ? '#8a8a8a' : '#767676',
  faint: isDark ? '#3a3a3a' : '#ececec',
  card: isDark ? '#242424' : '#f4f4f4',
  track: isDark ? '#333333' : '#e4e4e4',
  good: accents.green,
  average: accents.yellow,
  bad: accents.red,
  accent: accents.blue,
};

export const FONT = `font-family="-apple-system, Helvetica, sans-serif"`;

export function svg(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

export function toUri(markup: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`;
}

export function mdImg(markup: string, alt: string, width: number): string {
  return `![${alt}](${toUri(markup)}?raycast-width=${width})`;
}

export function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function scoreColor(score: number): string {
  if (score >= 0.9) return theme.good;
  if (score >= 0.5) return theme.average;
  return theme.bad;
}

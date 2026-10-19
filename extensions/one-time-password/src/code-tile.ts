import type { Image } from '@raycast/api';

type Palette = {
  text: string;
  muted: string;
  /** Separator and ring track, drawn faintly with fill-opacity (8-digit hex is not rendered everywhere). */
  line: string;
  track: string;
  ok: string;
  low: string;
  star: string;
  /** Background behind the favourite star, close to the card's own background. */
  plate: string;
  badge: string;
  badgeText: string;
};

// Close to Raycast's own text, separator, green, red and yellow in each appearance.
const LIGHT: Palette = {
  text: '#1C1C1E',
  muted: '#6E6E73',
  line: '#000000',
  track: '#000000',
  ok: '#2E9F5E',
  low: '#E5484D',
  star: '#E8A317',
  plate: '#FFFFFF',
  badge: '#E3E3E6',
  badgeText: '#3C3C43',
};
const DARK: Palette = {
  text: '#F2F2F7',
  muted: '#A1A1A6',
  line: '#FFFFFF',
  track: '#FFFFFF',
  ok: '#59D499',
  low: '#FF6363',
  star: '#FFC531',
  plate: '#2C2C2E',
  badge: '#3A3A3F',
  badgeText: '#E8E8ED',
};

export type Tile = {
  title: string;
  subtitle?: string;
  favorite: boolean;
  /** Logo as a data URI; the initials are drawn while it loads or when the service has none. */
  logo?: string;
  initials: string;
  code?: string;
  remaining: number;
  period: number;
};

const W = 320;
const H = 180;
const PAD = 18;
const FONT = `-apple-system, 'SF Pro Text', 'Segoe UI', sans-serif`;
// Average glyph width as a share of the font size, used to wrap text that SVG can't wrap by itself.
const GLYPH = 0.56;

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Shortens text to `max` characters on one line.
export function truncateEnd(text: string, max: number): string {
  const value = text.trim();
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

// Shortens text to `max` characters by cutting the middle, so both ends stay readable. Emails keep their whole
// domain when it fits: "sdffsdfsdfsdfdsfsd@gmail.com" → "sdffsdfsdfsdf…@gmail.com".
export function truncateMiddle(text: string, max: number): string {
  const value = text.trim();
  if (value.length <= max) return value;
  const at = value.lastIndexOf('@');
  const domain = at > 0 ? value.length - at : 0;
  const tail = domain && domain <= max - 5 ? domain : Math.floor((max - 1) / 2);
  return `${value.slice(0, max - 1 - tail)}…${value.slice(value.length - tail)}`;
}

function star(cx: number, cy: number, r: number, fill: string): string {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 ? r * 0.45 : r;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  });
  return `<polygon points="${points.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="1" stroke-linejoin="round"/>`;
}

// Countdown ring that empties clockwise from the top, with the seconds left in the middle.
function ring(cx: number, cy: number, r: number, fraction: number, color: string, p: Palette, seconds: number): string {
  const stroke = `fill="none" stroke-width="5"`;
  const parts = [`<circle cx="${cx}" cy="${cy}" r="${r}" ${stroke} stroke="${p.track}" stroke-opacity="0.12"/>`];
  if (fraction >= 0.999) {
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" ${stroke} stroke="${color}"/>`);
  } else if (fraction > 0) {
    const angle = fraction * 2 * Math.PI;
    const x = cx + r * Math.sin(angle);
    const y = cy - r * Math.cos(angle);
    parts.push(
      `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}" ${stroke} stroke="${color}" stroke-linecap="round"/>`,
    );
  }
  parts.push(
    `<text x="${cx}" y="${cy + 6}" font-size="16" font-weight="600" font-family="${FONT}" text-anchor="middle" fill="${p.text}">${seconds}</text>`,
  );
  return parts.join('');
}

function svg(tile: Tile, p: Palette): Image.Asset {
  const parts: string[] = [];
  const low = tile.remaining <= 5;

  // Logo, with favicons on a white plate so dark logos stay visible in dark mode.
  const logoX = PAD;
  const logoY = 20;
  const size = 42;
  if (tile.logo) {
    parts.push(`<rect x="${logoX}" y="${logoY}" width="${size}" height="${size}" rx="11" fill="#FFFFFF"/>`);
    parts.push(
      `<image x="${logoX + 8}" y="${logoY + 8}" width="${size - 16}" height="${size - 16}" href="${tile.logo}"/>`,
    );
  } else {
    parts.push(`<rect x="${logoX}" y="${logoY}" width="${size}" height="${size}" rx="11" fill="${p.badge}"/>`);
    parts.push(
      `<text x="${logoX + size / 2}" y="${logoY + 27}" font-size="16" font-weight="600" font-family="${FONT}" text-anchor="middle" fill="${p.badgeText}">${escape(tile.initials)}</text>`,
    );
  }
  // Favourites get a small star badge on the logo's corner, as the top right holds the countdown.
  if (tile.favorite) {
    parts.push(`<circle cx="${logoX + size - 2}" cy="${logoY + 2}" r="9.5" fill="${p.plate}"/>`);
    parts.push(star(logoX + size - 2, logoY + 2.5, 6.5, p.star));
  }

  // Service name and username, one line each; long usernames are shortened in the middle.
  const textX = logoX + size + 12;
  const ringR = 19;
  const ringX = W - PAD - ringR - 2.5;
  const textWidth = ringX - ringR - 10 - textX;
  parts.push(
    `<text x="${textX}" y="${logoY + 18}" font-size="20" font-weight="600" font-family="${FONT}" fill="${p.text}">${escape(truncateEnd(tile.title, Math.floor(textWidth / (20 * 0.6))))}</text>`,
  );
  if (tile.subtitle) {
    parts.push(
      `<text x="${textX}" y="${logoY + 38}" font-size="16" font-family="${FONT}" fill="${p.muted}">${escape(truncateMiddle(tile.subtitle, Math.floor(textWidth / (16 * GLYPH))))}</text>`,
    );
  }
  parts.push(ring(ringX, logoY + size / 2, ringR, tile.remaining / tile.period, low ? p.low : p.ok, p, tile.remaining));

  parts.push(`<rect x="0" y="82" width="${W}" height="1" fill="${p.line}" fill-opacity="0.12"/>`);

  // Code in large type, one digit per fixed-width slot so the spacing doesn't depend on the font the renderer picks;
  // shrunk so 8-digit codes fit as well as 6-digit ones.
  const baseline = 147;
  if (tile.code) {
    // A space in a grouped code ("123 456") takes half a slot.
    const chars = [...tile.code];
    const units = chars.reduce((sum, char) => sum + (char === ' ' ? 0.5 : 1), 0);
    const slot = Math.min(30, (W - 2 * PAD) / units);
    const codeSize = Math.min(44, Math.floor(slot / 0.66));
    let x = PAD;
    for (const char of chars) {
      if (char === ' ') {
        x += slot / 2;
        continue;
      }
      parts.push(
        `<text x="${(x + slot / 2).toFixed(1)}" y="${baseline}" font-size="${codeSize}" font-weight="700" font-family="${FONT}" text-anchor="middle" fill="${p.text}">${escape(char)}</text>`,
      );
      x += slot;
    }
  } else {
    parts.push(
      `<text x="${PAD}" y="${baseline - 6}" font-size="22" font-weight="600" font-family="${FONT}" fill="${p.low}">Invalid key</text>`,
    );
  }

  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`)}`;
}

// Card for the grid: logo, service, username, countdown ring and code, for both themes. Copying is the primary
// action (↵) and the rest is in the action panel (⌘K).
export function codeTile(tile: Tile): Image.ImageLike {
  return { source: { light: svg(tile, LIGHT), dark: svg(tile, DARK) } };
}

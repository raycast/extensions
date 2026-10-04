export interface PitchCard {
  name: string;
  /** Points text, or undefined when the player's fixture has not started */
  points?: string;
  /** data: URL of the shirt image; a plain shirt is drawn when missing */
  shirt?: string;
  captain?: boolean;
  tripleCaptain?: boolean;
  vice?: boolean;
  flagged?: boolean;
  /** Provisional bonus still to be confirmed */
  provisionalBonus?: number;
  autoSub?: "in" | "out";
  /** Bench label such as "1. MID" */
  label?: string;
}

export interface PitchStat {
  value: string;
  label: string;
}

export interface PitchData {
  title: string;
  subtitle: string;
  stats: PitchStat[];
  /** Highlighted center stat */
  highlight: PitchStat & { chip?: string };
  lines: PitchCard[][];
  bench: PitchCard[];
}

const W = 940;
const CARD_W = 110;
const CARD_GAP = 36;
const SHIRT_H = 118;
const BAR_H = 26;
const CARD_H = SHIRT_H + BAR_H * 2;
const HEADER_H = 220;
const PITCH_H = 4 * (CARD_H + 30) + 40;
const BENCH_H = CARD_H + 80;
const H = HEADER_H + PITCH_H + BENCH_H;

const PURPLE = "#37003c";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function card(c: PitchCard, x: number, y: number): string {
  const shirt = c.shirt
    ? `<image href="${c.shirt}" x="${x + 10}" y="${y}" width="${CARD_W - 20}" height="${SHIRT_H}" preserveAspectRatio="xMidYMid meet"/>`
    : `<path d="M${x + 25} ${y + 14} l18 -10 h24 l18 10 l14 24 -16 10 -6 -8 v78 h-64 v-78 l-6 8 -16 -10z" fill="#c9c9c9" stroke="#8a8a8a" stroke-width="2"/>`;
  const badge =
    c.captain || c.vice
      ? `<circle cx="${x + 12}" cy="${y + 12}" r="13" fill="${c.captain ? PURPLE : "#5a5a5a"}" stroke="#fff" stroke-width="2"/>
       <text x="${x + 12}" y="${y + 17}" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${c.tripleCaptain ? "T" : c.captain ? "C" : "V"}</text>`
      : "";
  const flag = c.flagged
    ? `<path d="M${x + CARD_W - 12} ${y + 2} l12 20 h-24z" fill="#ffb800" stroke="#fff" stroke-width="1.5"/>
       <text x="${x + CARD_W - 12}" y="${y + 19}" font-size="11" font-weight="800" fill="${PURPLE}" text-anchor="middle">!</text>`
    : "";
  const sub = c.autoSub
    ? `<circle cx="${x + CARD_W - 12}" cy="${y + SHIRT_H - 14}" r="12" fill="${c.autoSub === "in" ? "#1e88e5" : "#b71c1c"}" stroke="#fff" stroke-width="2"/>
       <text x="${x + CARD_W - 12}" y="${y + SHIRT_H - 9}" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">${c.autoSub === "in" ? "↑" : "↓"}</text>`
    : "";
  const label = c.label
    ? `<text x="${x + CARD_W / 2}" y="${y - 10}" font-size="13" font-weight="700" fill="${PURPLE}" text-anchor="middle">${esc(c.label)}</text>`
    : "";
  const nameY = y + SHIRT_H;
  const nameSize = c.name.length > 11 ? 12 : 14;
  return `
    ${label}${shirt}${badge}${flag}${sub}
    <rect x="${x}" y="${nameY}" width="${CARD_W}" height="${BAR_H}" fill="#fff"/>
    <text x="${x + CARD_W / 2}" y="${nameY + 18}" font-size="${nameSize}" font-weight="700" fill="${PURPLE}" text-anchor="middle">${esc(c.name)}</text>
    <rect x="${x}" y="${nameY + BAR_H}" width="${CARD_W}" height="${BAR_H}" fill="${PURPLE}"/>
    <text x="${x + CARD_W / 2}" y="${nameY + BAR_H + 18}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">${esc(c.points ?? "-")}${
      c.provisionalBonus ? `<tspan fill="#ffd54f" font-size="12"> (+${c.provisionalBonus})</tspan>` : ""
    }</text>`;
}

function row(cards: PitchCard[], y: number): string {
  const total = cards.length * CARD_W + (cards.length - 1) * CARD_GAP;
  const start = (W - total) / 2;
  return cards.map((c, i) => card(c, start + i * (CARD_W + CARD_GAP), y)).join("");
}

function header(d: PitchData): string {
  const boxW = 150;
  const center = W / 2;
  const others = d.stats.map((s, i) => {
    const side = i < 2 ? -1 : 1;
    const slot = i < 2 ? 2 - i : i - 1;
    const x = center + side * (95 + slot * boxW - boxW / 2);
    return `<text x="${x}" y="150" font-size="30" font-weight="700" fill="${PURPLE}" text-anchor="middle">${esc(s.value)}</text>
            <text x="${x}" y="176" font-size="13" fill="#5a5a5a" text-anchor="middle">${esc(s.label)}</text>`;
  });
  return `
    <text x="${center}" y="48" font-size="34" font-weight="800" fill="${PURPLE}" text-anchor="middle">${esc(d.title)}</text>
    <text x="${center}" y="80" font-size="20" font-weight="700" fill="${PURPLE}" text-anchor="middle">${esc(d.subtitle)}</text>
    <rect x="${center - 70}" y="100" width="140" height="${d.highlight.chip ? 106 : 84}" rx="8" fill="#02efff"/>
    <text x="${center}" y="150" font-size="40" font-weight="800" fill="${PURPLE}" text-anchor="middle">${esc(d.highlight.value)}</text>
    <text x="${center}" y="172" font-size="13" fill="${PURPLE}" text-anchor="middle">${esc(d.highlight.label)}</text>
    ${
      d.highlight.chip
        ? `<rect x="${center - 70}" y="180" width="140" height="26" rx="6" fill="${PURPLE}"/>
           <text x="${center}" y="198" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">${esc(d.highlight.chip)}</text>`
        : ""
    }
    ${others.join("")}`;
}

function pitch(): string {
  const top = HEADER_H;
  const stripes = Array.from({ length: 8 }, (_, i) => {
    const h = PITCH_H / 8;
    return `<rect x="0" y="${top + i * h}" width="${W}" height="${h}" fill="${i % 2 ? "#2f9f4f" : "#33a856"}"/>`;
  }).join("");
  const line = `fill="none" stroke="#e8f5ea" stroke-width="3"`;
  return `
    ${stripes}
    <rect x="40" y="${top + 16}" width="${W - 80}" height="${PITCH_H - 16}" ${line}/>
    <rect x="${W / 2 - 200}" y="${top + 16}" width="400" height="150" ${line}/>
    <rect x="${W / 2 - 90}" y="${top + 16}" width="180" height="60" ${line}/>
    <path d="M${W / 2 - 80} ${top + 166} a80 80 0 0 0 160 0" ${line}/>
    <rect x="${W / 2 - 60}" y="${top - 8}" width="120" height="24" fill="#fff" stroke="#bbb"/>
    <path d="M${W / 2 - 90} ${top + PITCH_H} a90 90 0 0 1 180 0" ${line}/>
    <circle cx="${W / 2}" cy="${top + PITCH_H}" r="5" fill="#e8f5ea"/>`;
}

export function renderPitchSvg(d: PitchData): string {
  const rowGap = (PITCH_H - 40) / 4;
  const lines = d.lines.map((cards, i) => row(cards, HEADER_H + 44 + i * rowGap)).join("");
  const benchTop = HEADER_H + PITCH_H;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system, Helvetica Neue, Helvetica, Arial, sans-serif">
  <rect width="${W}" height="${H}" fill="#fff"/>
  ${header(d)}
  ${pitch()}
  <rect x="0" y="${benchTop}" width="${W}" height="${BENCH_H}" fill="#e6e6e6"/>
  ${lines}
  ${row(d.bench, benchTop + 34)}
  <text x="${W / 2}" y="${benchTop + BENCH_H - 16}" font-size="18" font-weight="700" fill="${PURPLE}" text-anchor="middle">Substitutes</text>
</svg>`;
}

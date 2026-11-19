import type { StateValue } from "./mutedeck";

export type TileKind = "mute" | "video" | "share" | "record" | "leave" | "front";

// Color language borrowed from the physical-deck plugins: muted/recording =
// red, camera/share on = green, idle = dark tile, disabled = dimmed.
const RED = "#C22F2F";
const GREEN = "#0E9E52";
const IDLE = "#2A2A30";
const DISABLED_BG = "#1E1E22";
const GLYPH = "#FFFFFF";
const GLYPH_DIM = "#56565E";

interface TileStyle {
  bg: string;
  fg: string;
  slash: boolean;
}

function styleFor(kind: TileKind, state: StateValue): TileStyle {
  if (kind === "leave" || kind === "front") {
    const enabled = state === "active";
    return {
      bg: enabled ? IDLE : DISABLED_BG,
      fg: enabled ? GLYPH : GLYPH_DIM,
      slash: false,
    };
  }
  switch (state) {
    case "active":
      return {
        bg: kind === "video" || kind === "share" ? GREEN : RED,
        fg: GLYPH,
        slash: kind === "mute",
      };
    case "inactive":
      return { bg: IDLE, fg: GLYPH, slash: kind === "video" };
    default:
      return { bg: DISABLED_BG, fg: GLYPH_DIM, slash: false };
  }
}

function glyph(kind: TileKind, fg: string): string {
  const stroke = `stroke="${fg}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  switch (kind) {
    case "mute":
      return `
        <rect x="82" y="40" width="36" height="64" rx="18" fill="${fg}"/>
        <path d="M62 90 a38 38 0 0 0 76 0" ${stroke}/>
        <line x1="100" y1="128" x2="100" y2="146" ${stroke}/>
        <line x1="78" y1="146" x2="122" y2="146" ${stroke}/>`;
    case "video":
      return `
        <rect x="40" y="66" width="82" height="64" rx="12" fill="${fg}"/>
        <path d="M130 86 L160 68 V128 L130 110 Z" fill="${fg}"/>`;
    case "share":
      return `
        <rect x="42" y="52" width="116" height="78" rx="10" ${stroke}/>
        <line x1="100" y1="130" x2="100" y2="150" ${stroke}/>
        <line x1="72" y1="150" x2="128" y2="150" ${stroke}/>
        <path d="M100 112 V80 M84 94 L100 78 L116 94" ${stroke}/>`;
    case "record":
      return `
        <circle cx="100" cy="96" r="44" ${stroke}/>
        <circle cx="100" cy="96" r="21" fill="${fg}"/>`;
    case "leave":
      return `
        <path d="M112 46 H68 V148 H112" ${stroke}/>
        <line x1="92" y1="97" x2="156" y2="97" ${stroke}/>
        <path d="M136 77 L156 97 L136 117" ${stroke}/>`;
    case "front":
      return `
        <path d="M74 118 H60 V50 H140 V64" ${stroke}/>
        <rect x="74" y="76" width="72" height="72" rx="10" fill="${fg}"/>`;
  }
}

/**
 * Render a Stream Deck-style button as an SVG data URI for a Grid item:
 * rounded tile, state-colored background, white glyph, slash overlay when
 * something is off/muted.
 */
export function tileIcon(kind: TileKind, state: StateValue): string {
  const { bg, fg, slash } = styleFor(kind, state);
  const slashSvg = slash
    ? `<line x1="52" y1="38" x2="148" y2="152" stroke="${bg}" stroke-width="26" stroke-linecap="round"/>
       <line x1="52" y1="38" x2="148" y2="152" stroke="${fg}" stroke-width="10" stroke-linecap="round"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect x="4" y="4" width="192" height="192" rx="40" fill="${bg}" stroke="rgba(255,255,255,0.09)" stroke-width="2"/>
    ${glyph(kind, fg)}
    ${slashSvg}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

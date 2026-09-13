// Generates both extension icons (512x512, drawn full-square; rounded corners
// and transparency are applied by scripts/mask-icon.ts after rasterizing):
//
// - weather-sun-icon.svg — the extension/Weather icon: bold rayed sun and a
//   cloud on a bright day sky.
// - weather-fox-icon.svg — the Cast command icon: Cast's smiling face with a
//   sun peeking behind and a cloud in front.
//
//   npx tsx scripts/make-icon.ts
//   qlmanage -t -s 512 -o /tmp /tmp/weather-sun-icon.svg /tmp/weather-fox-icon.svg
//   npx tsx scripts/mask-icon.ts /tmp/weather-sun-icon.svg.png assets/weather-sun-icon.png
//   npx tsx scripts/mask-icon.ts /tmp/weather-fox-icon.svg.png assets/weather-fox-icon.png
import { writeFileSync } from "node:fs";
import { foxHead } from "../src/lib/cast-fox";
import { CAST, cloudShape } from "../src/lib/cast-core";

const S = 512;

// ---------------------------------------------------------------------------
// Weather icon: rayed sun + cloud, day sky
// ---------------------------------------------------------------------------

function sunIcon(): string {
  let rays = "";
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 * Math.PI) / 180;
    const x1 = 210 + Math.cos(a) * 128;
    const y1 = 200 + Math.sin(a) * 128;
    const x2 = 210 + Math.cos(a) * 168;
    const y2 = 200 + Math.sin(a) * 168;
    rays += `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${CAST.yellow}" stroke-width="26" stroke-linecap="round"/>`;
  }
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#2F6FD0"/>
    <stop offset="55%" stop-color="#4E97E8"/>
    <stop offset="100%" stop-color="#8CCAF5"/>
  </linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#sky)"/>
${rays}
<circle cx="210" cy="200" r="104" fill="${CAST.yellow}"/>
<circle cx="210" cy="200" r="104" fill="none" stroke="#FFE9AE" stroke-width="10" opacity="0.8"/>
<g fill="#FFFFFF" transform="translate(322 356) scale(0.98)">
  <ellipse cx="0" cy="0" rx="104" ry="56"/>
  <ellipse cx="-92" cy="22" rx="66" ry="40"/>
  <ellipse cx="94" cy="20" rx="74" ry="44"/>
  <rect x="-136" y="10" width="272" height="66" rx="33"/>
</g>
<ellipse cx="322" cy="423" rx="147" ry="25" fill="#D9E1F4" opacity="0.85"/>
</svg>`;
}

// ---------------------------------------------------------------------------
// Cast icon: the fox face with sun and cloud, dusk sky
// ---------------------------------------------------------------------------

function foxIcon(): string {
  // foxHead spans roughly x -88..88, y -128 (ear tips) .. +72 (chin fluff).
  const SCALE = 1.9;
  const TX = S / 2;
  const TY = S / 2 + 34 * SCALE;
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#2E2833"/>
    <stop offset="48%" stop-color="#6A4BD8"/>
    <stop offset="100%" stop-color="#F0439C"/>
  </linearGradient>
  <radialGradient id="sunglow">
    <stop offset="0%" stop-color="${CAST.yellow}" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="${CAST.yellow}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#sky)"/>

<circle cx="416" cy="84" r="5" fill="#FFF" opacity="0.85"/>
<circle cx="456" cy="180" r="3.5" fill="#FFF" opacity="0.6"/>
<circle cx="368" cy="132" r="3" fill="#FFF" opacity="0.5"/>
<path d="M 448 116 l 4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4 Z" fill="#FFF" opacity="0.85"/>

<!-- sun peeking behind the fox -->
<circle cx="120" cy="128" r="150" fill="url(#sunglow)"/>
<circle cx="120" cy="128" r="76" fill="${CAST.yellow}"/>
<circle cx="120" cy="128" r="76" fill="none" stroke="#FFE9AE" stroke-width="9" opacity="0.7"/>

<g transform="translate(${TX} ${TY}) scale(${SCALE})">
  ${foxHead({ expr: "open", noTwitch: true })}
</g>

<!-- cloud drifting in front -->
${cloudShape(392, 428, 1.15, "#FFFFFF", 1)}
<ellipse cx="396" cy="462" rx="72" ry="14" fill="#D9E1F4" opacity="0.9"/>
</svg>`;
}

writeFileSync("/tmp/weather-sun-icon.svg", sunIcon());
writeFileSync("/tmp/weather-fox-icon.svg", foxIcon());
console.log("wrote /tmp/weather-sun-icon.svg and /tmp/weather-fox-icon.svg");

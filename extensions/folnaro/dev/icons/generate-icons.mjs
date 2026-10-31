// Renders the command icons (512 px PNG, light and @dark) from the SVG glyphs below.
// Glyphs are drawn for this extension in the brand petrol (docs/brand/tokens.json, brandAccent);
// the extension icon itself is the approved app icon, copied unchanged from docs/brand/icons.
//
//   NODE_PATH="$(npm root -g)" node dev/icons/generate-icons.mjs
//
// Needs Playwright with a Chromium (preinstalled in the cloud container; on a Mac
// `npm i -g playwright && npx playwright install chromium`).
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const assets = join(root, "assets");

// One light from the upper left, teal running to petrol, like the mark. Dark: the same family lighter.
const THEMES = {
  light: { from: "#109DA8", to: "#006E7A" },
  dark: { from: "#A5F3EC", to: "#72DED9" },
};

const S = 'fill="none" stroke="url(#g)" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="url(#g)"';
const stopwatch = `<circle cx="256" cy="288" r="168" ${S}/><path d="M256 120V80M200 64h112M392 150l28-28" ${S}/>`;

const GLYPHS = {
  "command-search": `
    <circle cx="224" cy="224" r="144" ${S}/>
    <path d="M330 330L440 440" ${S} stroke-width="44"/>
    <path d="M176 160h64l40 40v72a12 12 0 0 1-12 12h-92a12 12 0 0 1-12-12v-100a12 12 0 0 1 12-12z" ${F}/>`,
  "command-start-timer": `${stopwatch}<path d="M226 220v136a10 10 0 0 0 15 9l108-68a10 10 0 0 0 0-17l-108-68a10 10 0 0 0-15 8z" ${F}/>`,
  "command-stop-timer": `${stopwatch}<rect x="196" y="228" width="120" height="120" rx="22" ${F}/>`,
  "command-running-timer": `${stopwatch}
    <path d="M256 288V168A120 120 0 0 1 359.9 348Z" ${F}/>`,
  "command-create-invoice": `
    <path d="M136 64h168l88 88v272a24 24 0 0 1-24 24H136a24 24 0 0 1-24-24V88a24 24 0 0 1 24-24z" ${S}/>
    <path d="M300 64v64a24 24 0 0 0 24 24h64" ${S}/>
    <path d="M252 232v144M180 304h144" ${S}/>`,
  "command-capture-receipt": `
    <path d="M168 48h176v200l-29 -20-29 20-29-20-29 20-29-20-31 20z" ${S}/>
    <path d="M216 112h80M216 168h56" ${S}/>
    <path d="M72 312h96l32 56h112l32-56h96v104a32 32 0 0 1-32 32H104a32 32 0 0 1-32-32z" ${S}/>`,
  "command-open-section": `
    <rect x="56" y="88" width="400" height="336" rx="48" ${S}/>
    <path d="M200 88v336M104 160h48M104 224h48M104 288h48" ${S}/>`,
};

function svg(body, theme) {
  const { from, to } = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="g" x1="64" y1="48" x2="448" y2="464" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <g transform="translate(256 256) scale(0.88) translate(-256 -256)">${body}</g></svg>`;
}

mkdirSync(assets, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
for (const [name, body] of Object.entries(GLYPHS)) {
  for (const theme of Object.keys(THEMES)) {
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg(body, theme)}</body></html>`);
    const file = join(assets, theme === "light" ? `${name}.png` : `${name}@dark.png`);
    await page.locator("svg").screenshot({ path: file, omitBackground: true });
    console.log("wrote", file);
  }
}
await browser.close();

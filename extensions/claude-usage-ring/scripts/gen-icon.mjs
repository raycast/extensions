import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const IVORY = "#FAF9F5";
const PAMPAS = "#F0EEE6";
const CLOUD = "#E8E6DC";
const CLAY = "#D97757";
const CRAIL = "#C15F3C";

const r = 148;
const circumference = 2 * Math.PI * r;
const fill = 0.68;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${IVORY}"/>
      <stop offset="1" stop-color="${PAMPAS}"/>
    </linearGradient>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CLAY}"/>
      <stop offset="1" stop-color="${CRAIL}"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)" stroke="${CLOUD}" stroke-width="4"/>
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="${CLOUD}" stroke-width="56"/>
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="url(#arc)" stroke-width="56" stroke-linecap="round"
    stroke-dasharray="${circumference * fill} ${circumference}" transform="rotate(-90 256 256)"/>
  <circle cx="256" cy="256" r="30" fill="${CLAY}"/>
</svg>`;

writeFileSync(new URL("../assets/extension-icon.png", import.meta.url), new Resvg(svg).render().asPng());

import { Position } from "./format";

export type Appearance = "light" | "dark";

const palettes = {
  light: { tv: "#1d1d1f", arm: "#86868b", wall: "#d2d2d7", glow: "#ff9f0a" },
  dark: { tv: "#f5f5f7", arm: "#8e8e93", wall: "#48484a", glow: "#ff9f0a" },
};

const WIDTH = 640;
const HEIGHT = 380;
const WALL_Y = 48;
const CENTER_X = WIDTH / 2;

export const tvAngle = (rotation: number) => -rotation * 0.45 || 0;

export function illustration({ distance, rotation }: Position, appearance: Appearance) {
  const color = palettes[appearance];
  const tvY = WALL_Y + 22 + distance * 1.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color.glow}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${color.glow}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <line x1="120" y1="${WALL_Y}" x2="${WIDTH - 120}" y2="${WALL_Y}" stroke="${color.wall}" stroke-width="6" stroke-linecap="round"/>
  <line x1="${CENTER_X}" y1="${WALL_Y}" x2="${CENTER_X}" y2="${tvY}" stroke="${color.arm}" stroke-width="6" stroke-linecap="round"/>
  <g transform="translate(${CENTER_X} ${tvY}) rotate(${tvAngle(rotation)})">
    <path d="M -112 7 L 112 7 L 180 110 L -180 110 Z" fill="url(#glow)"/>
    <rect x="-120" y="-7" width="240" height="14" rx="7" fill="${color.tv}"/>
  </g>
</svg>`;
}

const PROGRESS_WIDTH = 480;

export function progress(step: number, total: number, appearance: Appearance) {
  const color = palettes[appearance];
  const filled = (Math.min(step, total) / total) * PROGRESS_WIDTH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PROGRESS_WIDTH}" height="6" viewBox="0 0 ${PROGRESS_WIDTH} 6">
  <rect width="${PROGRESS_WIDTH}" height="6" rx="3" fill="${color.wall}"/>
  <rect width="${filled}" height="6" rx="3" fill="${color.glow}"/>
</svg>`;
}

export const svgMarkdown = (svg: string) => `![](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;

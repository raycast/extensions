import type { FormattedClockTime } from "./time";

type ClockArtOptions = {
  time: FormattedClockTime;
  date: string;
};

const SVG_WIDTH = 760;
const SVG_HEIGHT = 360;
const CARD_WIDTH = 132;
const CARD_HEIGHT = 118;
const CARD_Y = 92;
const CARD_GAP = 24;
const COLON_WIDTH = 20;
const MERIDIEM_WIDTH = 58;
const MERIDIEM_GAP = 18;

const escapeSvgText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function renderFlapCard(value: string, x: number, label: string): string {
  const [firstDigit, secondDigit] = value.split("").map(escapeSvgText);

  return `
    <g transform="translate(${x} ${CARD_Y})">
      <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="22" fill="url(#cardGradient)" filter="url(#cardShadow)" />
      <rect x="8" y="8" width="116" height="102" rx="17" fill="none" stroke="rgba(255,255,255,0.08)" />
      <path d="M0 59H${CARD_WIDTH}" stroke="rgba(0,0,0,0.58)" stroke-width="3" />
      <path d="M14 61H118" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
      <text x="43" y="81" text-anchor="middle" fill="#F6F1E8" font-family="SF Mono, Menlo, Monaco, ui-monospace, monospace" font-size="60" font-weight="800">${firstDigit}</text>
      <text x="89" y="81" text-anchor="middle" fill="#F6F1E8" font-family="SF Mono, Menlo, Monaco, ui-monospace, monospace" font-size="60" font-weight="800">${secondDigit}</text>
      <text x="66" y="158" text-anchor="middle" fill="#9B9CA0" font-family="SF Pro Text, -apple-system, BlinkMacSystemFont, Inter, Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="4">${label}</text>
    </g>`;
}

function renderColon(x: number): string {
  return `
    <g transform="translate(${x} 140)">
      <circle cx="10" cy="0" r="8" fill="#F6F1E8" opacity="0.96" />
      <circle cx="10" cy="47" r="8" fill="#F6F1E8" opacity="0.96" />
    </g>`;
}

export function renderClockSvg({ time, date }: ClockArtOptions): string {
  const safeDate = escapeSvgText(date);
  const safeMeridiem = time.meridiem ? escapeSvgText(time.meridiem) : "";
  const clockWidth =
    CARD_WIDTH * 3 +
    CARD_GAP * 4 +
    COLON_WIDTH * 2 +
    (safeMeridiem ? MERIDIEM_GAP + MERIDIEM_WIDTH : 0);
  const groupStart = (SVG_WIDTH - clockWidth) / 2;
  const hoursX = groupStart;
  const firstColonX = hoursX + CARD_WIDTH + CARD_GAP;
  const minutesX = firstColonX + COLON_WIDTH + CARD_GAP;
  const secondColonX = minutesX + CARD_WIDTH + CARD_GAP;
  const secondsX = secondColonX + COLON_WIDTH + CARD_GAP;
  const meridiemX = secondsX + CARD_WIDTH + MERIDIEM_GAP;
  const meridiem = safeMeridiem
    ? `
      <g transform="translate(${meridiemX} 132)">
        <rect x="0" y="0" width="${MERIDIEM_WIDTH}" height="38" rx="12" fill="#F6F1E8" opacity="0.96" />
        <text x="29" y="26" text-anchor="middle" fill="#18191C" font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Inter, Arial, sans-serif" font-size="22" font-weight="850" letter-spacing="1">${safeMeridiem}</text>
      </g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="Seconds Clock">
  <defs>
    <linearGradient id="sceneGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3F3F3D" />
      <stop offset="1" stop-color="#2E2F30" />
    </linearGradient>
    <linearGradient id="cardGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#242528" />
      <stop offset="0.49" stop-color="#18191C" />
      <stop offset="0.51" stop-color="#111215" />
      <stop offset="1" stop-color="#202125" />
    </linearGradient>
    <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="150%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity="0.34" />
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#FFFFFF" flood-opacity="0.06" />
    </filter>
  </defs>

  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="30" fill="url(#sceneGradient)" />
  <rect x="28" y="34" width="704" height="306" rx="28" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.06)" />

  ${renderFlapCard(time.hours, hoursX, "HOURS")}
  ${renderColon(firstColonX)}
  ${renderFlapCard(time.minutes, minutesX, "MINUTES")}
  ${renderColon(secondColonX)}
  ${renderFlapCard(time.seconds, secondsX, "SECONDS")}
  ${meridiem}

  <text x="380" y="324" text-anchor="middle" fill="#F6F1E8" font-family="SF Pro Text, -apple-system, BlinkMacSystemFont, Inter, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="5">${safeDate}</text>
</svg>`;
}

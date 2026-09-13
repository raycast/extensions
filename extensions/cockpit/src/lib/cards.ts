import { environment } from "@raycast/api";

const palette =
  environment.appearance === "dark"
    ? {
        card: "#2C2C2E",
        primary: "#F5F5F7",
        secondary: "#A7A7AC",
        track: "#48484A",
      }
    : {
        card: "#E9E9E7",
        primary: "#1C1C1E",
        secondary: "#737373",
        track: "#D0D0CE",
      };

export const accents = {
  green: "#2FC47A",
  orange: "#FFAA20",
  red: "#FF5A52",
  blue: "#3787FF",
  purple: "#7657E8",
  neutral: "#8E8E93",
};

export type SystemMetricIcon = "cpu" | "memory" | "disk" | "battery" | "uptime";

export interface RingMetricCard {
  icon: SystemMetricIcon;
  label: string;
  percent: number;
  value: string;
  detail: string;
  accent: string;
}

export interface NetworkMetricCard {
  direction: "down" | "up";
  value: string;
  average: string;
  total: string;
  accent: string;
}

export interface QuotaMetricCard {
  id: string;
  label: string;
  percent: number | null;
  reset: string;
  accent: string;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return replacements[character];
  });
}

function svgFrame(content: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
      <rect width="320" height="180" rx="20" fill="${palette.card}"/>
      ${content}
    </svg>
  `;
}

export function usageAccent(percent: number, inverted = false): string {
  const danger = inverted ? percent <= 15 : percent >= 90;
  const warning = inverted ? percent <= 75 : percent >= 50;
  return danger ? accents.red : warning ? accents.orange : accents.green;
}

function systemIcon(icon: SystemMetricIcon, accent: string): string {
  const common = `fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;

  switch (icon) {
    case "cpu":
      return `<g ${common}><rect x="0" y="2" width="45" height="32" rx="5"/><path d="M15 44h15M22.5 34v10"/></g>`;
    case "memory":
      return `<g ${common}><rect x="5" y="3" width="35" height="35" rx="5"/><path d="M14 12h17v17H14zM0 12h5M0 21h5M0 30h5M40 12h5M40 21h5M40 30h5"/></g>`;
    case "disk":
      return `<g ${common}><rect x="1" y="4" width="43" height="35" rx="7"/><path d="M1 28h43"/><circle cx="34" cy="34" r="2" fill="${accent}" stroke="none"/></g>`;
    case "battery":
      return `<g ${common}><rect x="0" y="6" width="39" height="29" rx="6"/><path d="M43 15v11M8 20h23"/></g>`;
    case "uptime":
      return `<g ${common}><circle cx="22" cy="22" r="19"/><path d="M22 11v12l8 5"/></g>`;
  }
}

export function systemMetricCard(card: RingMetricCard): string {
  return svgFrame(`
    <g transform="translate(28 24) scale(.6)">${systemIcon(card.icon, card.accent)}</g>
    <text x="64" y="47" fill="${palette.primary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="23" font-weight="600">${escapeXml(card.label)}</text>
    <text x="28" y="112" fill="${palette.primary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="46" font-weight="700" font-variant-numeric="tabular-nums" font-feature-settings="'tnum' 1, 'kern' 1"
      letter-spacing="-.6">${escapeXml(card.value)}</text>
    <text x="28" y="147" fill="${palette.secondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="21" font-weight="500">${escapeXml(card.detail)}</text>
  `);
}

export function networkMetricCard(card: NetworkMetricCard): string {
  const label = card.direction === "down" ? "Download" : "Upload";
  const arrow = card.direction === "down" ? '<path d="M16 2v31M7 24l9 9 9-9"/>' : '<path d="M16 33V2M7 11l9-9 9 9"/>';
  const valueParts = card.value.match(/^([\d.,]+)\s+(.+\/s)$/);
  const value = valueParts
    ? `${escapeXml(valueParts[1])}<tspan dx="7" fill="${palette.secondary}" font-size="24" font-weight="600" letter-spacing="0">${escapeXml(valueParts[2])}</tspan>`
    : escapeXml(card.value);

  return svgFrame(`
    <g transform="translate(30 24) scale(.82)" fill="none" stroke="${card.accent}" stroke-width="5"
      stroke-linecap="round" stroke-linejoin="round">${arrow}</g>
    <text x="64" y="47" fill="${palette.primary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="23" font-weight="600">${label}</text>
    <text x="28" y="112" fill="${palette.primary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="42" font-weight="700" font-variant-numeric="tabular-nums" font-feature-settings="'tnum' 1, 'kern' 1"
      letter-spacing="-.6">${value}</text>
    <text x="28" y="147" fill="${palette.secondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="21" font-weight="500">Avg ${escapeXml(card.average)}</text>
  `);
}

export function quotaMetricCard(card: QuotaMetricCard): string {
  const normalized = card.percent == null ? null : Math.max(0, Math.min(100, card.percent));
  const progressWidth = normalized == null ? 0 : (normalized / 100) * 264;
  const progress =
    normalized == null
      ? ""
      : `<rect x="28" y="83" width="${progressWidth}" height="9" rx="4.5" fill="${card.accent}"/>`;

  return svgFrame(`
    <text x="28" y="47" fill="${palette.primary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="22" font-weight="600">${escapeXml(card.label)}</text>
    <text x="292" y="47" text-anchor="end" fill="${palette.primary}"
      font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="700"
      font-variant-numeric="tabular-nums" font-feature-settings="'tnum' 1, 'kern' 1" letter-spacing="-.4">${normalized == null ? "—" : `${normalized}%`}</text>
    <rect x="28" y="83" width="264" height="9" rx="4.5" fill="${palette.track}"/>
    ${progress}
    <text x="28" y="147" fill="${palette.secondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
      font-size="22" font-weight="500">${escapeXml(card.reset)}</text>
  `);
}

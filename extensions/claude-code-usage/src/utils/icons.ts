import { CLAUDE_BRAND_COLOR, TIER_COLORS, TRACK_COLOR } from "./constants";

const CLAUDE_CODE_MARK_PATH =
  "M72.945 46.045L80.6 46.045L80.6 53.955L72.95 53.955L72.95 61.676L69.158 61.676L69.158 69.125L65.3 69.125L65.3 61.676L61.508 61.676L61.508 69.125L57.65 69.125L57.65 61.676L42.35 61.676L42.35 69.125L38.494 69.125L38.494 61.676L34.7 61.676L34.7 69.125L30.842 69.125L30.842 61.676L27.05 61.676L27.05 53.953L19.4 53.953L19.4 46.047L27.05 46.047L27.05 30.875L72.945 30.875L72.945 46.045ZM34.7 46.045L38.494 46.045L38.494 38.785L34.7 38.785L34.7 46.045ZM61.501 46.045L65.3 46.045L65.3 38.785L61.501 38.785L61.501 46.045Z";

function tierColorFor(percent: number): string {
  if (percent >= 85) return TIER_COLORS.red;
  if (percent >= 50) return TIER_COLORS.orange;
  return TIER_COLORS.green;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

type IconOptions = {
  progress?: number;
  isMonochrome?: boolean;
};

export function createClaudeProgressSvg({
  progress = 0,
  isMonochrome = false,
}: IconOptions): string {
  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const stroke = 10;
  const radius = 50 - stroke / 2;
  const trackPath = `M 50 ${50 - radius} A ${radius} ${radius} 0 1 0 50 ${50 + radius} A ${radius} ${radius} 0 1 0 50 ${50 - radius}`;

  const trackStroke = isMonochrome
    ? "white"
    : safeProgress < 1
      ? TRACK_COLOR
      : tierColorFor(safeProgress * 100);
  const trackOpacity = safeProgress < 1 ? 0.35 : 1;
  const arcStroke = isMonochrome ? "white" : tierColorFor(safeProgress * 100);
  const logoFill = isMonochrome ? "white" : CLAUDE_BRAND_COLOR;

  const arcPath =
    safeProgress > 0 && safeProgress < 1
      ? `<path d="${describeArc(50, 50, radius, 0, safeProgress * 360)}" stroke="${arcStroke}" stroke-width="${stroke}" fill="none" />`
      : "";

  const svg =
    `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="${trackPath}" stroke="${trackStroke}" stroke-width="${stroke}" opacity="${trackOpacity}" fill="none" />
    ${arcPath}
    <path d="${CLAUDE_CODE_MARK_PATH}" fill="${logoFill}" fill-rule="evenodd" />
  </svg>`.replaceAll("\n", "");

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function getClaudeUsageIcon(progress = 0): string {
  return createClaudeProgressSvg({ progress, isMonochrome: false });
}

export function getClaudeMenuBarIcon(progress = 0): string {
  return createClaudeProgressSvg({ progress, isMonochrome: true });
}

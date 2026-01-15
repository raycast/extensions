import { DailyCost } from "../types";

const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;
const BAR_GAP = 2;
const PADDING = { top: 40, right: 15, bottom: 45, left: 50 };

export function generateCostChartSVG(dailyCosts: DailyCost[]): string {
  if (dailyCosts.length === 0) {
    return generateEmptyChartSVG();
  }

  const sortedCosts = [...dailyCosts].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const last14Days = sortedCosts.slice(-14);
  const maxCost = Math.max(...last14Days.map((d) => d.cost), 0.01);
  const totalCost = sortedCosts.reduce((sum, d) => sum + d.cost, 0);

  const chartInnerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartInnerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const barWidth = Math.max(
    (chartInnerWidth - BAR_GAP * (last14Days.length - 1)) / last14Days.length,
    8,
  );

  const bars = last14Days
    .map((day, index) => {
      const barHeight = Math.max((day.cost / maxCost) * chartInnerHeight, 2);
      const x = PADDING.left + index * (barWidth + BAR_GAP);
      const y = PADDING.top + chartInnerHeight - barHeight;

      const isToday = isSameDay(day.date, new Date());
      const color = isToday ? "#4ECDC4" : "#F5A623";

      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2"/>`;
    })
    .join("\n");

  const labels = last14Days
    .map((day, index) => {
      if (index % 2 !== 0 && last14Days.length > 7) return "";
      const x = PADDING.left + index * (barWidth + BAR_GAP) + barWidth / 2;
      const label = day.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `<text x="${x}" y="${CHART_HEIGHT - 8}" class="axis-label" text-anchor="middle">${label}</text>`;
    })
    .filter(Boolean)
    .join("\n");

  const valueLabels = last14Days
    .map((day, index) => {
      if (day.cost < maxCost * 0.1) return "";
      const barHeight = Math.max((day.cost / maxCost) * chartInnerHeight, 2);
      const x = PADDING.left + index * (barWidth + BAR_GAP) + barWidth / 2;
      const y = PADDING.top + chartInnerHeight - barHeight - 5;
      return `<text x="${x}" y="${y}" class="value-label" text-anchor="middle">$${day.cost.toFixed(0)}</text>`;
    })
    .filter(Boolean)
    .join("\n");

  const gridLines = [0.25, 0.5, 0.75, 1]
    .map((pct) => {
      const y = PADDING.top + chartInnerHeight * (1 - pct);
      const value = maxCost * pct;
      return `
      <line x1="${PADDING.left}" y1="${y}" x2="${CHART_WIDTH - PADDING.right}" y2="${y}" stroke="#333" stroke-dasharray="4"/>
      <text x="${PADDING.left - 8}" y="${y + 4}" class="axis-label" text-anchor="end">$${value.toFixed(0)}</text>
    `;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}">
    <style>
      .axis-label { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 9px; fill: #666; }
      .value-label { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 8px; fill: #fff; font-weight: 500; }
      .title { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; fill: #fff; font-weight: 600; }
      .subtitle { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; fill: #888; }
    </style>
    <rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="#1a1a1a" rx="8"/>
    ${gridLines}
    ${bars}
    ${valueLabels}
    ${labels}
    <text x="${PADDING.left}" y="16" class="title">Daily Cost (Last 14 Days)</text>
    <text x="${CHART_WIDTH - PADDING.right}" y="16" class="subtitle" text-anchor="end">Total: $${totalCost.toFixed(2)}</text>
  </svg>`;
}

function generateEmptyChartSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_WIDTH}" height="100" viewBox="0 0 ${CHART_WIDTH} 100">
    <style>
      .empty { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; fill: #666; }
    </style>
    <rect width="${CHART_WIDTH}" height="100" fill="#1a1a1a" rx="8"/>
    <text x="${CHART_WIDTH / 2}" y="55" class="empty" text-anchor="middle">No cost data available</text>
  </svg>`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function generateProgressBarSVG(
  percentage: number,
  label: string,
  sublabel?: string,
  pace?: { status: "ahead" | "behind" | "on-track"; percentage: number },
): string {
  const width = 280;
  const labelLines = label.split("\n");
  const lineHeight = 14;
  const labelBlockHeight = labelLines.length * lineHeight;
  const barY = labelBlockHeight + 8;
  const barHeight = 12;
  const baseHeight = barY + barHeight + 8;
  const extraHeight = (sublabel ? 14 : 0) + (pace ? 14 : 0);
  const height = baseHeight + extraHeight;
  const clampedPct = Math.max(0, Math.min(100, percentage));

  const color =
    percentage >= 90 ? "#FF6B6B" : percentage >= 70 ? "#FFE66D" : "#4ECDC4";

  const filledWidth = (clampedPct / 100) * (width - 20);

  const labelText = labelLines
    .map(
      (line, i) =>
        `<tspan x="10" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`,
    )
    .join("");

  let paceText = "";
  if (pace) {
    const paceColor =
      pace.status === "behind"
        ? "#4ECDC4"
        : pace.status === "ahead"
          ? "#FF6B6B"
          : "#FFE66D";
    const paceSign = pace.status === "behind" ? "-" : "+";
    paceText = `<text x="${width - 10}" y="${barY + barHeight + 12}" class="pace" text-anchor="end" fill="${paceColor}">${paceSign}${Math.round(pace.percentage)}% ${pace.status}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>
      .label { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; fill: #fff; font-weight: 500; }
      .pct { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; fill: ${color}; font-weight: 600; }
      .sub { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; fill: #888; }
      .pace { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; font-weight: 500; }
    </style>
    <text x="10" y="14" class="label">${labelText}</text>
    <text x="${width - 10}" y="14" class="pct" text-anchor="end">${Math.round(percentage)}%</text>
    <rect x="10" y="${barY}" width="${width - 20}" height="${barHeight}" fill="#333" rx="6"/>
    <rect x="10" y="${barY}" width="${filledWidth}" height="${barHeight}" fill="${color}" rx="6"/>
    ${sublabel ? `<text x="10" y="${barY + barHeight + 12}" class="sub">${sublabel}</text>` : ""}
    ${paceText}
  </svg>`;
}

export function generateUsageGaugeSVG(
  percentage: number,
  label: string,
): string {
  const size = 90;
  const radius = 35;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clampedPct / 100) * circumference;

  const color =
    percentage >= 90 ? "#FF6B6B" : percentage >= 70 ? "#FFE66D" : "#4ECDC4";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <style>
      .bg { stroke: #333; fill: none; }
      .progress { stroke: ${color}; fill: none; stroke-linecap: round; }
      .text { font-family: -apple-system, BlinkMacSystemFont, sans-serif; fill: #fff; text-anchor: middle; }
      .percentage { font-size: 16px; font-weight: bold; }
      .label { font-size: 9px; fill: #888; }
    </style>
    <circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke-width="${strokeWidth}"/>
    <circle class="progress" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke-width="${strokeWidth}"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="${size / 2}" y="${size / 2 + 5}" class="text percentage">${Math.round(percentage)}%</text>
    <text x="${size / 2}" y="${size / 2 + 18}" class="text label">${label}</text>
  </svg>`;
}

export function generateStatsCardSVG(
  title: string,
  value: string,
  subtitle?: string,
): string {
  const width = 130;
  const height = 70;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>
      .title { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; fill: #888; }
      .value { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; fill: #fff; font-weight: 600; }
      .subtitle { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 9px; fill: #666; }
    </style>
    <rect width="${width}" height="${height}" fill="#252525" rx="8"/>
    <text x="12" y="22" class="title">${title}</text>
    <text x="12" y="46" class="value">${value}</text>
    ${subtitle ? `<text x="12" y="60" class="subtitle">${subtitle}</text>` : ""}
  </svg>`;
}

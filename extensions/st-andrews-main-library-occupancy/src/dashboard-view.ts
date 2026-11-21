import { congestionHue } from "./data";

export interface Metric {
  label: string;
  value?: string;
  hue?: number;
  loading?: boolean;
}

// shortcut: sized for the standard Detail view, switch to native layout when Raycast supports columns.
const width = 720;
const rowSpacing = 34;
const sectionGap = 13;
const dividerThickness = 1.5;
const dividerOpacity = 0.1;
const summaryTop = 40;
const endpointBaseline = 86;
// Reserve room for the ink below “Busy” before starting the divider gap.
const dividerTop = summaryTop + endpointBaseline + 2.5 + sectionGap;
const metricsTop = dividerTop + dividerThickness + sectionGap;
const bubbleAscent = 18;

function escapeMarkup(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function graphic(label: string, height: number, content: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system, sans-serif">${content}</svg>`;
  return `<img alt="${escapeMarkup(label)}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" />`;
}

function palette(dark: boolean) {
  return { foreground: dark ? "#f4f4f5" : "#212127", muted: dark ? "#b6b6bf" : "#595963" };
}

function bubbleTint(hue: number) {
  return `hsl(${hue}, 84%, 53%)`;
}

function skeleton(
  dark: boolean,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = height / 2,
  hue?: number,
) {
  const tint = hue === undefined ? (dark ? "#e5e6ed" : "#757581") : bubbleTint(hue);
  return `<rect class="skeleton" x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"
    fill="${tint}" opacity="${dark ? 0.12 : 0.1}"/>`;
}

function occupancySection(percentage: string, people: string, rate: number | undefined, dark: boolean) {
  const { foreground, muted } = palette(dark);
  const heading = "📚 LIBRARY OCCUPANCY";
  const baseline = 38;
  const secondarySize = 12;
  const barTop = 50;
  const barHeight = 18;
  const radius = barHeight / 2;
  const track = dark ? "#ffffff" : "#000000";
  const summary = (description: string, content: string) => ({
    label: `${heading}. ${description}. Scale from Quiet to Busy.`,
    content: `<text y="18" fill="${foreground}" font-size="20" font-weight="700"><tspan x="0" dy="1" font-family="Apple Color Emoji">📚</tspan><tspan x="30" dy="-1"> LIBRARY OCCUPANCY</tspan></text>
      <g transform="translate(0 ${summaryTop})">
        ${content}
        <text x="0" y="${endpointBaseline}" fill="${muted}" font-size="${secondarySize}">Quiet</text>
        <text x="${width}" y="${endpointBaseline}" text-anchor="end" fill="${muted}" font-size="${secondarySize}">Busy</text>
        <rect y="${dividerTop - summaryTop}" width="${width}" height="${dividerThickness}" rx="${dividerThickness / 2}" fill="${track}" opacity="${dividerOpacity}"/>
      </g>`,
  });
  if (rate === undefined) {
    return summary(
      "Loading occupancy",
      skeleton(dark, 0, 5, 112, 34, 8) +
        skeleton(dark, width - 108, baseline - 11, 108, 11, 4) +
        skeleton(dark, 0, barTop, width, barHeight),
    );
  }
  const fill = `hsl(${congestionHue(rate ?? 0)}, 52%, ${dark ? 56 : 34}%)`;
  const indicator =
    rate === 0
      ? `<circle cx="${radius}" cy="${barTop + radius}" r="5" fill="${fill}"/>`
      : `<rect y="${barTop}" width="${Math.min(rate, 1) * width}" height="${barHeight}" rx="${radius}" fill="${fill}"/>`;

  return summary(
    `${percentage === "—" ? "Occupancy unavailable" : percentage + " occupancy"}, ${people}`,
    `<text x="0" y="${baseline}" fill="${foreground}" font-size="46" font-weight="650">${escapeMarkup(percentage)}</text>
    <text x="${width}" y="${baseline}" text-anchor="end" fill="${muted}" font-size="${secondarySize}">${escapeMarkup(people)}</text>
    <rect y="${barTop}" width="${width}" height="${barHeight}" rx="${radius}" fill="${track}" opacity=".15"/>
    ${indicator}`,
  );
}

function metricRow(metric: Metric, left: number, right: number, y: number, dark: boolean) {
  const { foreground, muted } = palette(dark);
  const { label, value } = metric;
  const hue = value === "—" ? undefined : metric.hue;
  if (metric.loading) {
    const pillWidth = label ? 54 : 114;
    const rowLabel = label
      ? `<text x="${left}" y="${y}" fill="${foreground}" font-size="15" font-weight="550">${escapeMarkup(label)}</text>`
      : skeleton(dark, left, y - 13, 98, 16, 5);
    return rowLabel + skeleton(dark, right - pillWidth, y - bubbleAscent, pillWidth, 26, 7, metric.hue);
  }
  if (value === undefined) {
    return `<text x="${left}" y="${y}" fill="${muted}" font-size="15">${escapeMarkup(label)}</text>`;
  }

  const textColor = hue === undefined ? muted : `hsl(${hue}, ${dark ? 78 : 88}%, ${dark ? 71 : 27}%)`;
  const background = hue === undefined ? textColor : bubbleTint(hue);
  const preferredWidth = 18 + [...value].length * 8;
  const bubbleWidth = Math.min(Math.max(32, preferredWidth), (right - left) / 2);
  const labelWidth = right - left - bubbleWidth - 12;
  const fitLabel =
    [...label].length * 9 > labelWidth ? ` textLength="${labelWidth}" lengthAdjust="spacingAndGlyphs"` : "";
  const fitValue =
    preferredWidth > bubbleWidth ? ` textLength="${bubbleWidth - 18}" lengthAdjust="spacingAndGlyphs"` : "";
  const labelClip = `label-${left}-${y}`;

  return `<clipPath id="${labelClip}"><rect x="${left}" y="${y - bubbleAscent}" width="${labelWidth}" height="26"/></clipPath>
    <text x="${left}" y="${y}" clip-path="url(#${labelClip})" fill="${foreground}" font-size="15" font-weight="550"${fitLabel}>${escapeMarkup(label)}</text>
    <rect x="${right - bubbleWidth}" y="${y - bubbleAscent}" width="${bubbleWidth}" height="26" rx="7" fill="${background}" opacity="${dark ? 0.17 : 0.13}"/>
    <text x="${right - bubbleWidth / 2}" y="${y}" text-anchor="middle" fill="${textColor}" font-size="14" font-weight="500"${fitValue}>${escapeMarkup(value)}</text>`;
}

function metricsSection(statistics: Metric[], rooms: Metric[] | undefined, sorted: boolean, dark: boolean) {
  const { muted } = palette(dark);
  const gutter = 56;
  const columnWidth = (width - gutter) / 2;
  const rightStart = columnWidth + gutter;
  const headingBaseline = 9;
  // The heading ink ends half a unit below the baseline; the pill starts the row.
  const rowStart = headingBaseline + 0.5 + sectionGap + bubbleAscent;
  const roomRows = rooms ?? Array.from({ length: 5 }, () => ({ label: "", loading: true }));
  const height = rowStart + (Math.max(statistics.length, roomRows.length) - 1) * rowSpacing + 9;
  const rows = (items: Metric[], left: number, right: number) =>
    items.map((item, index) => metricRow(item, left, right, rowStart + index * rowSpacing, dark)).join("");
  const describe = (items: Metric[]) =>
    items
      .map(({ label, value, loading }) =>
        loading ? `${label}: loading` : value === undefined ? label : `${label}: ${value}`,
      )
      .join("; ");
  const sortNote = sorted ? "Sorted by availability" : "";

  return {
    label: `STATS. ${describe(statistics)}. AVAILABLE COMPUTERS. ${sortNote ? sortNote + ". " : ""}${rooms ? describe(rooms) : "Loading computer availability"}.`,
    height,
    content: `<rect x="${(width - dividerThickness) / 2}" y="1" width="${dividerThickness}" height="${height - 2}" rx="${dividerThickness / 2}"
      fill="${dark ? "#ffffff" : "#000000"}" opacity="${dividerOpacity}"/>
    <text x="0" y="${headingBaseline}" fill="${muted}" font-size="12" font-weight="500">STATS</text>
    <text x="${rightStart}" y="${headingBaseline}" fill="${muted}" font-size="12" font-weight="500">AVAILABLE COMPUTERS</text>
    <text x="${width}" y="${headingBaseline}" fill="${muted}" text-anchor="end" font-size="11">${sortNote}</text>
    ${rows(statistics, 0, columnWidth)}
    ${rows(roomRows, rightStart, width)}`,
  };
}

export function dashboardGraphic(
  percentage: string,
  people: string,
  rate: number | undefined,
  statistics: Metric[],
  rooms: Metric[] | undefined,
  sorted: boolean,
  dark: boolean,
) {
  const occupancy = occupancySection(percentage, people, rate, dark);
  const metrics = metricsSection(statistics, rooms, sorted, dark);
  return graphic(
    `${occupancy.label} ${metrics.label}`,
    metricsTop + metrics.height,
    `${occupancy.content}<g transform="translate(0 ${metricsTop})">${metrics.content}</g>`,
  );
}

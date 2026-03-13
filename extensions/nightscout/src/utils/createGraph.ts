import { GlucoseEntry } from "../types";
import { environment } from "@raycast/api";
import { convertGlucoseForDisplay } from "./unitConversion";

function svgToDataUrl(svgString: string): string {
  const base64 = Buffer.from(svgString).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function scaleMgdl(value: number, useMmol: boolean): number {
  return convertGlucoseForDisplay(value, useMmol);
}

export const FONT_SIZES = {
  small: 10,
  medium: 12,
  large: 14,
  extraLarge: 16,
};

interface GraphOptions {
  useMmol?: boolean;
  logarithmic?: boolean;
  targetLowMg?: number;
  targetHighMg?: number;
  urgentLowMg?: number;
  highAlertMg?: number;
}

/**
 * Creates a graph representation of glucose data in base64-encoded SVG format.
 * @param data - Array of glucose readings
 * @param hoursToShow - Number of hours of data to display
 * @param width - Width of the graph
 * @param height - Height of the graph
 * @param fontSize - Font size for labels
 * @param options - Additional graph options
 * @returns SVG string representing the graph
 */
export function createGraph(
  data: GlucoseEntry[],
  hoursToShow: number = 2,
  width = 700,
  height = 550,
  fontSize = FONT_SIZES.large,
  options: GraphOptions = {},
): string {
  const margin = { top: 20, right: 40, bottom: 50, left: 30 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // get theme colors based on Raycast appearance
  const isDark = environment.appearance === "dark";
  const colors = {
    text: isDark ? "#999" : "#666",
    grid: isDark ? "#666" : "#ccc",
    axis: isDark ? "#999" : "#666",
    data: isDark ? "#4da6ff" : "#1f77b4",
    pointStroke: isDark ? "#000" : "#fff",
  };

  // define fixed time range based on hoursToShow parameter
  const now = Date.now();
  const timeRangeMs = hoursToShow * 60 * 60 * 1000;
  const minX = now - timeRangeMs;
  const maxX = now;

  // filter data to only include points within our time range
  const filteredData = data.filter((d) => d.date >= minX && d.date <= maxX);

  // for Y-axis, use appropriate range based on units and scaling type
  const minY = scaleMgdl(40, options.useMmol || false);
  let maxY = scaleMgdl(400, options.useMmol || false);

  if (filteredData.length > 0) {
    const yValues = filteredData.map((d) => scaleMgdl(d.sgv, options.useMmol || false));
    const dataMaxY = Math.max(...yValues);

    // if any value exceeds maxY, extend the range to accommodate it
    if (dataMaxY > maxY) {
      maxY = Math.max(dataMaxY * 1.1, maxY); // add 10% padding above highest value
    }
  }

  const scaleX = (x: number) => ((x - minX) / (maxX - minX)) * chartWidth;

  // implement logarithmic or linear scaling based on options
  const scaleY = options.logarithmic
    ? (y: number) => {
        // logarithmic scale similar to nightscout
        const logMinY = Math.log(minY);
        const logMaxY = Math.log(maxY);
        const logY = Math.log(Math.max(y, minY));
        return chartHeight - ((logY - logMinY) / (logMaxY - logMinY)) * chartHeight;
      }
    : (y: number) => chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;

  // generate path for the line
  const pathData =
    filteredData.length > 0
      ? filteredData
          .map((point, index) => {
            const x = scaleX(point.date) + margin.left;
            const y = scaleY(scaleMgdl(point.sgv, options.useMmol || false)) + margin.top;
            return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
          })
          .join(" ")
      : "";

  // generate data points
  const dataPoints =
    filteredData.length > 0
      ? filteredData
          .map((point) => {
            const x = scaleX(point.date) + margin.left;
            const y = scaleY(scaleMgdl(point.sgv, options.useMmol || false)) + margin.top;
            return `<circle cx="${x}" cy="${y}" r="3" fill="${colors.data}" />`;
          })
          .join("\n    ")
      : "";

  // generate Y axis ticks using nightscout-style values
  const yTicks: string[] = [];

  // get tick values based on scaling type and units, following nightscout implementation
  const getTickValues = () => {
    if (options.logarithmic) {
      // logarithmic tick values from nightscout - always start with mg/dL values then convert
      const mgdlValues = [
        40,
        options.urgentLowMg || 55,
        options.targetLowMg || 70,
        120,
        options.targetHighMg || 180,
        options.highAlertMg || 260,
        400,
      ];
      return mgdlValues.map((val) => scaleMgdl(val, options.useMmol || false));
    } else {
      // linear tick values from nightscout - always start with mg/dL values then convert
      const mgdlValues = [40, 80, 120, 160, 200, 240, 280, 320, 360, 400];
      return mgdlValues.map((val) => scaleMgdl(val, options.useMmol || false));
    }
  };

  const tickValues = getTickValues();
  // only show ticks that are within our Y range
  const visibleValues = tickValues.filter((value) => value >= minY && value <= maxY);

  visibleValues.forEach((value) => {
    const y = scaleY(value) + margin.top;
    // format the label based on units
    const label = options.useMmol ? value.toFixed(1) : value.toString();

    // determine line style based on value type
    let strokeDashArray = "5,3"; // default grid line
    let strokeColor = colors.grid;

    // special styling for target range lines (similar to nightscout)
    if (value === options.targetLowMg || value === options.targetHighMg) {
      strokeDashArray = "3,3";
      strokeColor = colors.axis;
    }
    // special styling for critical values (very low = 55, high alert levels)
    else if (
      value === scaleMgdl(options.urgentLowMg || 55, options.useMmol || false) ||
      value === scaleMgdl(options.highAlertMg || 260, options.useMmol || false) ||
      value === scaleMgdl(400, options.useMmol || false)
    ) {
      strokeDashArray = "1,6";
      strokeColor = "#777";
    }

    yTicks.push(`
      <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="${strokeDashArray}"/>
      <line x1="${width - margin.right}" y1="${y}" x2="${width - margin.right + 5}" y2="${y}" stroke="${colors.axis}" stroke-width="1"/>
      <text x="${width - margin.right + 10}" y="${y + 4}" text-anchor="start" font-size="${fontSize}" class="chart-text">${label}</text>
    `);
  });

  // generate X axis ticks with dynamic spacing to prevent overlap
  const xTicks = [];

  // calculate appropriate tick interval based on time range and available space
  const getTickInterval = (hoursToShow: number, chartWidth: number): number => {
    const thirtyMinutes = 30 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    const twoHours = 2 * 60 * 60 * 1000;
    const threeHours = 3 * 60 * 60 * 1000;
    const sixHours = 6 * 60 * 60 * 1000;

    // estimate minimum space needed for each tick label (roughly 60px for "12:30 PM")
    const minSpacePerTick = 60;
    const maxTicksToFit = Math.floor(chartWidth / minSpacePerTick);
    const totalTimeMs = hoursToShow * 60 * 60 * 1000;

    // possible intervals in order of preference
    const intervals = [thirtyMinutes, oneHour, twoHours, threeHours, sixHours];

    // find the smallest interval that doesn't exceed our tick limit
    for (const interval of intervals) {
      const tickCount = Math.ceil(totalTimeMs / interval);
      if (tickCount <= maxTicksToFit) {
        return interval;
      }
    }

    // fallback to 6-hour intervals if nothing else fits
    return sixHours;
  };

  const tickInterval = getTickInterval(hoursToShow, chartWidth);
  const startTime = minX;
  const endTime = maxX;

  // round start time to appropriate interval boundary
  const startDate = new Date(startTime);
  if (tickInterval >= 60 * 60 * 1000) {
    startDate.setMinutes(0, 0, 0);
  } else {
    const startMinutes = startDate.getMinutes();
    const roundedStartMinutes = startMinutes < 30 ? 0 : 30;
    startDate.setMinutes(roundedStartMinutes, 0, 0);
  }

  let currentTime = startDate.getTime();

  while (currentTime <= endTime) {
    if (currentTime >= startTime) {
      const x = scaleX(currentTime) + margin.left;
      const y = height - margin.bottom;

      // format the timestamp to a readable time
      const date = new Date(currentTime);
      const timeLabel = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: tickInterval >= 60 * 60 * 1000 ? undefined : "2-digit", // hide minutes for hourly+ intervals
        hour12: true,
      });

      xTicks.push(`
        <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 5}" stroke="${colors.axis}" stroke-width="1"/>
        <text x="${x}" y="${y + 18 + fontSize / 4}" text-anchor="middle" font-size="${fontSize}" class="chart-text">${timeLabel}</text>
      `);
    }

    currentTime += tickInterval;
  }

  return svgToDataUrl(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .chart-text {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        fill: ${colors.text};
      }
    </style>

    <!-- Top border -->
    <line x1="${margin.left}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top}" stroke="${colors.axis}" stroke-width="1"/>
    <!-- Bottom border (X axis) -->
    <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="${colors.axis}" stroke-width="1"/>
    <!-- Left border (Y axis) -->
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="${colors.axis}" stroke-width="1"/>
    <!-- Right border -->
    <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="${colors.axis}" stroke-width="1"/>

    ${yTicks.join("")}
    ${xTicks.join("")}

    <path d="${pathData}" fill="none" stroke="${colors.data}" stroke-width="2"/>

    ${dataPoints}

    ${filteredData.length === 0 ? `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="${fontSize}" class="chart-text">No data available</text>` : ""}
  </svg>`);
}

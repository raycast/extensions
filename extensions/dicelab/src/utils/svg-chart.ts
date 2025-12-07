// SVG bar chart generation for PMF visualization

export interface PMFBin {
  label: string;
  probability: number;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  barColor?: string;
  backgroundColor?: string;
  textColor?: string;
  title?: string;
  showLegend?: boolean;
}

export interface ColorScheme {
  bg: string;
  border: string;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export const DATASET_COLORS: ColorScheme[] = [
  { bg: "rgba(80, 160, 255, 0.35)", border: "rgba(80, 160, 255, 0.8)" }, // Blue
  { bg: "rgba(255, 99, 132, 0.35)", border: "rgba(255, 99, 132, 0.8)" }, // Red
  { bg: "rgba(75, 192, 192, 0.35)", border: "rgba(75, 192, 192, 0.8)" }, // Teal
  { bg: "rgba(255, 159, 64, 0.35)", border: "rgba(255, 159, 64, 0.8)" }, // Orange
  { bg: "rgba(153, 102, 255, 0.35)", border: "rgba(153, 102, 255, 0.8)" }, // Purple
  { bg: "rgba(255, 205, 86, 0.35)", border: "rgba(255, 205, 86, 0.8)" }, // Yellow
  { bg: "rgba(54, 162, 235, 0.35)", border: "rgba(54, 162, 235, 0.8)" }, // Light Blue
  { bg: "rgba(201, 203, 207, 0.35)", border: "rgba(201, 203, 207, 0.8)" }, // Gray
];

const DEFAULT_OPTIONS: Required<ChartOptions> = {
  width: 500,
  height: 250,
  barColor: "#50A0FF",
  backgroundColor: "transparent",
  textColor: "#FFFFFF",
  title: "",
  showLegend: false,
};

export function generatePMFBarChart(
  bins: PMFBin[],
  options: ChartOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { width, height, barColor, backgroundColor, textColor, title } = opts;

  if (bins.length === 0) {
    return generateEmptyChart(width, height, textColor);
  }

  const maxProbability = Math.max(...bins.map((b) => b.probability));
  const padding = { top: title ? 30 : 10, right: 10, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const barWidth = Math.max(2, Math.floor(chartWidth / bins.length) - 1);
  const barGap = 1;

  // Generate bars
  const bars = bins
    .map((bin, i) => {
      const barHeight =
        maxProbability > 0
          ? (bin.probability / maxProbability) * chartHeight
          : 0;
      const x = padding.left + i * (barWidth + barGap);
      const y = padding.top + chartHeight - barHeight;

      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${barColor}" opacity="0.8"/>`;
    })
    .join("\n");

  // Generate x-axis labels (show subset if too many)
  const labelInterval = Math.max(1, Math.ceil(bins.length / 10));
  const xLabels = bins
    .filter((_, i) => i % labelInterval === 0 || i === bins.length - 1)
    .map((bin) => {
      const originalIndex = bins.findIndex((b) => b.label === bin.label);
      const x =
        padding.left + originalIndex * (barWidth + barGap) + barWidth / 2;
      const y = height - 10;
      return `<text x="${x}" y="${y}" text-anchor="middle" fill="${textColor}" font-size="10">${escapeXml(bin.label)}</text>`;
    })
    .join("\n");

  // Generate y-axis labels
  const yAxisSteps = 5;
  const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const prob = (maxProbability / yAxisSteps) * i;
    const y = padding.top + chartHeight - (i / yAxisSteps) * chartHeight;
    const label = `${(prob * 100).toFixed(0)}%`;
    return `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" fill="${textColor}" font-size="10">${label}</text>`;
  }).join("\n");

  // Title
  const titleElement = title
    ? `<text x="${width / 2}" y="20" text-anchor="middle" fill="${textColor}" font-size="14" font-weight="bold">${escapeXml(title)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
  ${titleElement}
  ${bars}
  ${xLabels}
  ${yLabels}
  <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="${textColor}" stroke-opacity="0.3"/>
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="${textColor}" stroke-opacity="0.3"/>
</svg>`;
}

export function generateCombinedPMFBarChart(
  chartData: ChartData,
  options: ChartOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { width, height, backgroundColor, textColor, title, showLegend } = opts;

  if (chartData.labels.length === 0 || chartData.datasets.length === 0) {
    return generateEmptyChart(width, height, textColor);
  }

  // Calculate max probability across all datasets
  const maxProbability = Math.max(
    ...chartData.datasets.flatMap((ds) => ds.data),
  );

  // Adjust padding for legend
  const legendHeight = showLegend && chartData.datasets.length > 1 ? 30 : 0;
  const padding = {
    top: (title ? 30 : 10) + legendHeight,
    right: 10,
    bottom: 40,
    left: 50,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate bar dimensions
  const barGroupWidth = Math.max(
    2,
    Math.floor(chartWidth / chartData.labels.length) - 1,
  );
  const barWidth = Math.max(
    1,
    Math.floor(barGroupWidth / chartData.datasets.length),
  );
  const barGap = 1;

  // Generate bars for each dataset
  const bars = chartData.datasets
    .flatMap((dataset, datasetIndex) => {
      return chartData.labels.map((label, labelIndex) => {
        const value = dataset.data[labelIndex];
        const barHeight =
          maxProbability > 0 ? (value / maxProbability) * chartHeight : 0;

        const groupX = padding.left + labelIndex * (barGroupWidth + barGap);
        const barX = groupX + datasetIndex * barWidth;
        const barY = padding.top + chartHeight - barHeight;

        return `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${dataset.borderColor}" opacity="0.8"/>`;
      });
    })
    .join("\n");

  // Generate legend if showLegend && multiple datasets
  const legend =
    showLegend && chartData.datasets.length > 1
      ? chartData.datasets
          .map((dataset, index) => {
            const legendX = padding.left + index * 120;
            const legendY = title ? 40 : 20;
            return `
      <rect x="${legendX}" y="${legendY - 10}" width="12" height="12" fill="${dataset.borderColor}" opacity="0.8"/>
      <text x="${legendX + 18}" y="${legendY}" fill="${textColor}" font-size="10">${escapeXml(dataset.label)}</text>
    `;
          })
          .join("")
      : "";

  // Generate x-axis labels (show subset if too many)
  const labelInterval = Math.max(1, Math.ceil(chartData.labels.length / 10));
  const xLabels = chartData.labels
    .filter(
      (_, i) => i % labelInterval === 0 || i === chartData.labels.length - 1,
    )
    .map((label) => {
      const originalIndex = chartData.labels.indexOf(label);
      const x =
        padding.left +
        originalIndex * (barGroupWidth + barGap) +
        barGroupWidth / 2;
      const y = height - 10;
      return `<text x="${x}" y="${y}" text-anchor="middle" fill="${textColor}" font-size="10">${escapeXml(label)}</text>`;
    })
    .join("\n");

  // Generate y-axis labels
  const yAxisSteps = 5;
  const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const prob = (maxProbability / yAxisSteps) * i;
    const y = padding.top + chartHeight - (i / yAxisSteps) * chartHeight;
    const label = `${(prob * 100).toFixed(0)}%`;
    return `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" fill="${textColor}" font-size="10">${label}</text>`;
  }).join("\n");

  // Title
  const titleElement = title
    ? `<text x="${width / 2}" y="20" text-anchor="middle" fill="${textColor}" font-size="14" font-weight="bold">${escapeXml(title)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
  ${titleElement}
  ${legend}
  ${bars}
  ${xLabels}
  ${yLabels}
  <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="${textColor}" stroke-opacity="0.3"/>
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="${textColor}" stroke-opacity="0.3"/>
</svg>`;
}

function generateEmptyChart(
  width: number,
  height: number,
  textColor: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="${textColor}" font-size="14">No data</text>
</svg>`;
}

// Convert SVG to data URI for markdown embedding
export function svgToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

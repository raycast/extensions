import { DataPoint } from "../types";

export function renderGraphToSVG(
  expression: string,
  dataSegments: DataPoint[][],
  xDomain: [number, number],
  yDomain: [number, number],
  lineColor: string,
  theme: "light" | "dark" | null = "light",
) {
  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const axisColor = theme === "dark" ? "#FFFFFF" : "#888888";
  const gridColor =
    theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const textColor = theme === "dark" ? "#FFFFFF" : "#000000";

  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;

  // Scale functions
  const scaleX = (x: number) =>
    padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const scaleY = (y: number) =>
    padding.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

  try {
    // Create grid lines
    const gridLines: string[] = [];
    const numGridLines = 5;

    // Vertical grid lines
    for (let i = 0; i <= numGridLines; i++) {
      const x = padding.left + (i / numGridLines) * plotWidth;
      gridLines.push(
        `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="${gridColor}" stroke-dasharray="3,3" />`,
      );
    }

    // Horizontal grid lines
    for (let i = 0; i <= numGridLines; i++) {
      const y = padding.top + (i / numGridLines) * plotHeight;
      gridLines.push(
        `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${gridColor}" stroke-dasharray="3,3" />`,
      );
    }

    // Create axis labels
    const xLabels: string[] = [];
    const yLabels: string[] = [];

    for (let i = 0; i <= numGridLines; i++) {
      const xVal = xMin + (i / numGridLines) * (xMax - xMin);
      const xPos = padding.left + (i / numGridLines) * plotWidth;
      xLabels.push(
        `<text x="${xPos}" y="${height - padding.bottom + 20}" fill="${textColor}" font-size="12" text-anchor="middle">${xVal.toFixed(1)}</text>`,
      );

      const yVal = yMin + (i / numGridLines) * (yMax - yMin);
      const yPos = padding.top + plotHeight - (i / numGridLines) * plotHeight;
      yLabels.push(
        `<text x="${padding.left - 10}" y="${yPos + 4}" fill="${textColor}" font-size="12" text-anchor="end">${yVal.toFixed(1)}</text>`,
      );
    }

    // Create path for each segment
    const paths = dataSegments
      .map((segment) => {
        if (segment.length === 0) return "";

        const pathData = segment
          .map((point, index) => {
            const x = scaleX(point.x);
            const y = scaleY(point.y);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");

        return `<path d="${pathData}" stroke="${lineColor}" stroke-width="2" fill="none" />`;
      })
      .filter((p) => p !== "");

    // Axes
    const xAxis = `<line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="${axisColor}" stroke-width="2" />`;
    const yAxis = `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="${axisColor}" stroke-width="2" />`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${gridLines.join("\n      ")}
      ${xAxis}
      ${yAxis}
      ${xLabels.join("\n      ")}
      ${yLabels.join("\n      ")}
      ${paths.join("\n      ")}
    </svg>`;
  } catch (error) {
    console.error("SVG rendering error:", error);
    return "";
  }
}

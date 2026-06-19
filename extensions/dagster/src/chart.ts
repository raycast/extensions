import { environment } from "@raycast/api";
import { readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

interface ChartOptions {
  title: string;
  dates: string[];
  values: number[];
  bgColor: string;
  fgColor: string;
  lineColor: string;
  gridColor: string;
}

export function generateChart(opts: ChartOptions): string {
  const { title, dates, values, bgColor, fgColor, lineColor, gridColor } = opts;

  const width = 720;
  const height = 400;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 50;
  const padBottom = 90;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  if (values.length === 0) {
    return writeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="${width / 2}" y="${height / 2}" fill="${fgColor}" text-anchor="middle" font-family="sans-serif" font-size="16">No data</text>
    </svg>`,
      title,
    );
  }

  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  const yRange = yMax - yMin || 1;
  const yPad = yRange * 0.1;
  const yLow = yMin - yPad;
  const yHigh = yMax + yPad;

  function xPos(i: number): number {
    return padLeft + (values.length === 1 ? plotW / 2 : (i / (values.length - 1)) * plotW);
  }
  function yPos(v: number): number {
    return padTop + plotH - ((v - yLow) / (yHigh - yLow)) * plotH;
  }

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`);
  lines.push(`<rect width="100%" height="100%" fill="${bgColor}"/>`);

  // Title
  lines.push(
    `<text x="${width / 2}" y="30" fill="${fgColor}" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold">${escapeXml(title)}</text>`,
  );

  // Y-axis grid + labels
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const v = yLow + (i / gridCount) * (yHigh - yLow);
    const y = yPos(v);
    lines.push(
      `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="${gridColor}" stroke-dasharray="4,4"/>`,
    );
    lines.push(
      `<text x="${padLeft - 8}" y="${y + 6}" fill="${fgColor}" text-anchor="end" font-family="sans-serif" font-size="18">${formatNum(v)}</text>`,
    );
  }

  // Line path
  const points = values.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(" ");
  lines.push(`<polyline fill="none" stroke="${lineColor}" stroke-width="3" points="${points}"/>`);

  // Data points
  for (let i = 0; i < values.length; i++) {
    lines.push(`<circle cx="${xPos(i).toFixed(1)}" cy="${yPos(values[i]).toFixed(1)}" r="4" fill="${lineColor}"/>`);
  }

  // X-axis date labels (show ~6 evenly spaced)
  const labelCount = Math.min(dates.length, 6);
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1 || 1)) * (dates.length - 1));
    const x = xPos(idx);
    lines.push(
      `<text x="${x}" y="${height - padBottom + 20}" fill="${fgColor}" text-anchor="end" font-family="sans-serif" font-size="18" transform="rotate(-45 ${x} ${height - padBottom + 20})">${escapeXml(dates[idx])}</text>`,
    );
  }

  lines.push(`</svg>`);
  return writeSvg(lines.join("\n"), title);
}

function writeSvg(svg: string, name: string): string {
  const dir = environment.supportPath;
  const slug = name.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
  const prefix = `chart_${slug}_`;
  // Remove previous versions of this specific chart to bust Raycast image cache
  try {
    for (const f of readdirSync(dir)) {
      if (f.startsWith(prefix) && f.endsWith(".svg")) {
        unlinkSync(join(dir, f));
      }
    }
  } catch {
    // ignore if dir doesn't exist yet
  }
  const path = join(dir, `${prefix}${Date.now()}.svg`);
  writeFileSync(path, svg, "utf-8");
  return path;
}

function formatNum(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

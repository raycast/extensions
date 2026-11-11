import type { DefiWindow } from "./parse";

const column = { width: 44, height: 64, gap: 6, inset: 8 };
const minWidth = 240;
const palette = {
  // Six-digit colors with separate opacities: some native SVG renderers ignore eight-digit hex.
  light: { desk: ["#000000", 0.06], window: ["#FFFFFF", 1], stroke: ["#000000", 0.12], highlight: "#007AFF" },
  dark: { desk: ["#FFFFFF", 0.07], window: ["#FFFFFF", 0.14], stroke: ["#FFFFFF", 0.12], highlight: "#0A84FF" },
};

// Tiled windows of one workspace, as columns of stacked windows in strip order.
export function stripColumns(windows: DefiWindow[], workspaceID: string): DefiWindow[][] {
  const columns: DefiWindow[][] = [];
  for (const window of windows) {
    if (window.workspace?.id !== workspaceID || !window.column) continue;
    (columns[window.column - 1] ??= []).push(window);
  }
  return Array.from(columns, (windows) => (windows ?? []).sort((a, b) => (a.row ?? 0) - (b.row ?? 0)));
}

// The strip as an SVG: one rounded tile per window, the highlighted one in the accent color.
export function stripSVG(columns: DefiWindow[][], highlightID: number | undefined, dark: boolean): string {
  const colors = dark ? palette.dark : palette.light;
  const stripWidth = Math.max(columns.length, 1) * (column.width + column.gap) - column.gap;
  const width = Math.max(minWidth, column.inset * 2 + stripWidth);
  const left = (width - stripWidth) / 2;
  const tiles = columns.flatMap((windows, index) => {
    const rowHeight = (column.height - column.gap * (windows.length - 1)) / Math.max(windows.length, 1);
    return windows.map((window, row) => {
      const highlighted = window.id === highlightID;
      const x = left + index * (column.width + column.gap);
      const y = column.inset + row * (rowHeight + column.gap);
      const [fill, fillOpacity] = highlighted ? [colors.highlight, 1] : colors.window;
      const [stroke, strokeOpacity] = highlighted ? [colors.highlight, 1] : colors.stroke;
      return `<rect x="${x}" y="${y}" width="${column.width}" height="${rowHeight}" rx="6" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}"/>`;
    });
  });
  const height = column.inset * 2 + column.height;
  const desk = `<rect width="${width}" height="${height}" rx="12" fill="${colors.desk[0]}" fill-opacity="${colors.desk[1]}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${desk}${tiles.join("")}</svg>`;
}

// Markdown image of a workspace's strip, or nothing when it has no tiled window.
export function stripImage(windows: DefiWindow[], workspaceID: string, highlightID: number | undefined, dark: boolean) {
  const columns = stripColumns(windows, workspaceID);
  if (columns.length === 0) return "";
  const svg = Buffer.from(stripSVG(columns, highlightID, dark)).toString("base64");
  return `![Strip](data:image/svg+xml;base64,${svg})`;
}

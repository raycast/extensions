import type { ChunkGrid } from "./bitfield";

export type Appearance = "light" | "dark";

const DARK = {
  background: "#11151C",
  border: "#252B36",
  missing: "#2B313D",
  mid: "#F5B84B",
  complete: "#35D07F",
};

const LIGHT = {
  background: "#FFFFFF",
  border: "#E4E7EC",
  missing: "#E4E7EC",
  mid: "#E09A17",
  complete: "#2BB673",
};

function parseHex(color: string): [number, number, number] {
  const normalized = color.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function mix(from: string, to: string, ratio: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const clamped = Math.max(0, Math.min(1, ratio));
  return toHex([
    a[0] + (b[0] - a[0]) * clamped,
    a[1] + (b[1] - a[1]) * clamped,
    a[2] + (b[2] - a[2]) * clamped,
  ]);
}

export function colorForFraction(
  fraction: number,
  appearance: Appearance,
): string {
  const palette = appearance === "light" ? LIGHT : DARK;
  const clamped = Math.max(0, Math.min(1, fraction));
  if (clamped <= 0) return palette.missing;
  if (clamped >= 1) return palette.complete;
  if (clamped < 0.5) return mix(palette.missing, palette.mid, clamped / 0.5);
  return mix(palette.mid, palette.complete, (clamped - 0.5) / 0.5);
}

export function renderHeatmapSvg(
  grid: ChunkGrid,
  appearance: Appearance,
): string {
  const palette = appearance === "light" ? LIGHT : DARK;
  const cell = 24;
  const gap = 3;
  const padding = 20;
  const width = padding * 2 + grid.columns * cell + (grid.columns - 1) * gap;
  const height = padding * 2 + grid.rows * cell + (grid.rows - 1) * gap;

  const cells: string[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const fraction = grid.fractions[row]?.[column] ?? 0;
      const x = padding + column * (cell + gap);
      const y = padding + row * (cell + gap);
      cells.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4" fill="${colorForFraction(
          fraction,
          appearance,
        )}" />`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="${palette.background}" stroke="${palette.border}" />`,
    ...cells,
    "</svg>",
  ].join("");
}

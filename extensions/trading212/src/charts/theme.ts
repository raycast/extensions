export type Appearance = "light" | "dark";

export interface ChartTheme {
  text: string;
  mutedText: string;
  gridLine: string;
  up: string;
  down: string;
  neutralTile: string;
  upTile: string;
  downTile: string;
  accent: string;
  /** Earlier months in the deposits chart (this month uses `accent`). */
  accentMuted: string;
  mutedBar: string;
  fontFamily: string;
}

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, sans-serif`;

const THEMES: Record<Appearance, ChartTheme> = {
  dark: {
    text: "#f2f2f2",
    mutedText: "#9a9c9a",
    gridLine: "#3a3c3a",
    // Raycast's own green and red (dark theme); tiles are those hues tinted onto the background.
    up: "#59d499",
    down: "#ff6363",
    neutralTile: "#2c2c2e",
    upTile: "#397057",
    downTile: "#833d3e",
    accent: "#0a84ff",
    accentMuted: "#1f4f86",
    mutedBar: "#305545",
    fontFamily: FONT,
  },
  light: {
    text: "#1f2321",
    mutedText: "#6b706c",
    gridLine: "#dcdfdc",
    up: "#1e9e5a",
    down: "#e5484d",
    neutralTile: "#e8e8ea",
    upTile: "#a4ecd2",
    downTile: "#ffb9b8",
    accent: "#0a72e0",
    accentMuted: "#a9cdf5",
    mutedBar: "#b6e9d0",
    fontFamily: FONT,
  },
};

export function chartTheme(appearance: Appearance): ChartTheme {
  return THEMES[appearance];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const RETURN_CLAMP = 30;

export function returnColor(pct: number, theme: ChartTheme): string {
  const t = Math.max(-1, Math.min(1, pct / RETURN_CLAMP));
  const base = hexToRgb(theme.neutralTile);
  const target = hexToRgb(t >= 0 ? theme.upTile : theme.downTile);
  const a = Math.abs(t) ** 0.7;
  const [r, g, b] = base.map((c, i) => Math.round(c + (target[i] - c) * a));
  return `rgb(${r},${g},${b})`;
}

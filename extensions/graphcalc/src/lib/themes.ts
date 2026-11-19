// Theme catalog for the graph card. Pure module: safe to use outside Raycast.
//
// The graph is an SVG embedded in markdown, so Raycast never sees its colors
// and cannot adapt them to the user's theme. Every theme therefore paints its
// own background and only ever uses concrete CSS colors (hex/rgb). Raycast
// `Color` tokens such as "raycast-yellow" are not valid inside an SVG and are
// silently dropped by the Windows renderer.

export const THEME_IDS = [
  "system",
  "paper",
  "noir",
  "terminal",
  "blueprint",
  "synthwave",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
}

export const DEFAULT_THEME_ID: ThemeId = "system";

export interface GraphTheme {
  title: string;
  /** Card fill: a solid color, or a top-to-bottom gradient pair. */
  background: string | [string, string];
  /** Minor grid lines. */
  grid: string;
  /** Plot axes. */
  axis: string;
  /** Tick labels and title. */
  text: string;
  /** The plotted curve. */
  line: string;
}

// Every `line`, `axis` and `text` color keeps a contrast ratio >= 3:1 (WCAG AA
// for graphics) against the background (against both stops for gradients).

/** Blends with stock Raycast in light appearance. */
const SYSTEM_LIGHT: GraphTheme = {
  title: "System",
  background: "#F7F7F9",
  grid: "#DEDEE3",
  axis: "#6E6E73",
  text: "#1D1D1F",
  line: "#0A6FE8",
};

/** Blends with stock Raycast in dark appearance. */
const SYSTEM_DARK: GraphTheme = {
  title: "System",
  background: "#1C1C1E",
  grid: "#3A3A3C",
  axis: "#A1A1A6",
  text: "#F2F2F7",
  line: "#3B9EFF",
};

const STYLIZED: Record<Exclude<ThemeId, "system">, GraphTheme> = {
  paper: {
    title: "Paper",
    background: "#FBF6E9",
    grid: "#E6DCC4",
    axis: "#8A7A5C",
    text: "#3D3427",
    line: "#C2410C",
  },
  noir: {
    title: "Noir",
    background: "#111111",
    grid: "#2A2A2A",
    axis: "#8C8C8C",
    text: "#E6E6E6",
    line: "#FFFFFF",
  },
  terminal: {
    title: "Terminal",
    background: "#061A0E",
    grid: "#0F3A1F",
    axis: "#2E9E57",
    text: "#C8FFD4",
    line: "#4AFA7B",
  },
  blueprint: {
    title: "Blueprint",
    background: "#0D3585",
    grid: "#1F4A9E",
    axis: "#9AD1FF",
    text: "#EAF4FF",
    line: "#FFFFFF",
  },
  synthwave: {
    title: "Synthwave",
    background: ["#2B1B5A", "#12082E"],
    grid: "#4B2E86",
    axis: "#01CDFE",
    text: "#FFFFFF",
    line: "#FF71CE",
  },
};

/** Human-readable list for menus, in display order. */
export const THEME_INFO: { id: ThemeId; title: string }[] = THEME_IDS.map(
  (id) => ({
    id,
    title: id === "system" ? SYSTEM_LIGHT.title : STYLIZED[id].title,
  }),
);

/**
 * Resolve a theme id to concrete colors. `appearance` only matters for
 * `system`, which follows Raycast's light/dark mode.
 */
export function themeFor(
  id: ThemeId,
  appearance: "light" | "dark" | null | undefined,
): GraphTheme {
  if (id === "system")
    return appearance === "dark" ? SYSTEM_DARK : SYSTEM_LIGHT;
  return STYLIZED[id];
}

/** Every concrete theme, for previews and contrast checks. */
export function allThemes(): { id: string; theme: GraphTheme }[] {
  return [
    { id: "system-light", theme: SYSTEM_LIGHT },
    { id: "system-dark", theme: SYSTEM_DARK },
    ...(Object.keys(STYLIZED) as (keyof typeof STYLIZED)[]).map((id) => ({
      id,
      theme: STYLIZED[id],
    })),
  ];
}

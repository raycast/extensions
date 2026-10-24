export type ThemeId = "rayterm" | "one-dark-pro" | "pure" | "dracula" | "catppuccin-mocha";

export interface RaytermTheme {
  id: ThemeId;
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  indicator: string;
  ansi: string[];
}

export const DEFAULT_THEME_ID: ThemeId = "rayterm";

const RAYTERM_BASE_ANSI = [
  "#1f2937",
  "#ef4444",
  "#22c55e",
  "#eab308",
  "#3b82f6",
  "#d946ef",
  "#06b6d4",
  "#e5e7eb",
  "#6b7280",
  "#f87171",
  "#4ade80",
  "#facc15",
  "#60a5fa",
  "#e879f9",
  "#22d3ee",
  "#ffffff",
];

export const THEMES: RaytermTheme[] = [
  {
    id: "rayterm",
    name: "RayTerm",
    background: "#111827",
    foreground: "#d6deeb",
    cursor: "#e5e7eb",
    indicator: "#64748b",
    ansi: RAYTERM_BASE_ANSI,
  },
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    background: "#282c34",
    foreground: "#abb2bf",
    cursor: "#528bff",
    indicator: "#5c6370",
    ansi: [
      "#282c34",
      "#e06c75",
      "#98c379",
      "#e5c07b",
      "#61afef",
      "#c678dd",
      "#56b6c2",
      "#abb2bf",
      "#5c6370",
      "#e06c75",
      "#98c379",
      "#d19a66",
      "#61afef",
      "#c678dd",
      "#56b6c2",
      "#ffffff",
    ],
  },
  {
    id: "pure",
    name: "Pure",
    background: "#000000",
    foreground: "#ffffff",
    cursor: "#ffffff",
    indicator: "#7f7f7f",
    ansi: [
      "#000000",
      "#cd0000",
      "#00cd00",
      "#cdcd00",
      "#0000ee",
      "#cd00cd",
      "#00cdcd",
      "#e5e5e5",
      "#7f7f7f",
      "#ff0000",
      "#00ff00",
      "#ffff00",
      "#5c5cff",
      "#ff00ff",
      "#00ffff",
      "#ffffff",
    ],
  },
  {
    id: "dracula",
    name: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    cursor: "#f8f8f2",
    indicator: "#6272a4",
    ansi: [
      "#21222c",
      "#ff5555",
      "#50fa7b",
      "#f1fa8c",
      "#bd93f9",
      "#ff79c6",
      "#8be9fd",
      "#f8f8f2",
      "#6272a4",
      "#ff6e6e",
      "#69ff94",
      "#ffffa5",
      "#d6acff",
      "#ff92df",
      "#a4ffff",
      "#ffffff",
    ],
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    cursor: "#f5e0dc",
    indicator: "#6c7086",
    ansi: [
      "#45475a",
      "#f38ba8",
      "#a6e3a1",
      "#f9e2af",
      "#89b4fa",
      "#f5c2e7",
      "#94e2d5",
      "#bac2de",
      "#585b70",
      "#f38ba8",
      "#a6e3a1",
      "#f9e2af",
      "#89b4fa",
      "#f5c2e7",
      "#94e2d5",
      "#a6adc8",
    ],
  },
];

export function getTheme(themeId: string | undefined) {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];
}

export function mapThemeColor(theme: RaytermTheme, color: string | undefined, fallback: string) {
  if (!color) return fallback;
  const normalized = color.toLowerCase();
  const baseIndex = RAYTERM_BASE_ANSI.indexOf(normalized);
  if (baseIndex >= 0) return theme.ansi[baseIndex] ?? fallback;
  return color;
}

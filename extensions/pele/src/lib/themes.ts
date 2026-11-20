export const THEMES = [
  {
    id: "light",
    title: "Light",
    colors: {
      bg: "#ffffff",
      fg: "#1f1f1f",
      muted: "#6e6e6e",
      line: "#1f1f1f",
      surface: "#f3f3f3",
      "surface-alt": "#e6e6e6",
      border: "#8a8a8a",
      accent: "#5b7bd5",
      critical: "#e45756",
    },
  },
  {
    id: "dark",
    title: "Dark",
    colors: {
      bg: "#18181b",
      fg: "#f4f4f5",
      muted: "#a1a1aa",
      line: "#e4e4e7",
      surface: "#27272a",
      "surface-alt": "#3f3f46",
      border: "#71717a",
      accent: "#93b4ff",
      critical: "#f87171",
    },
  },
  {
    id: "flexoki-light",
    title: "Flexoki Light",
    colors: {
      bg: "#fffcf0",
      fg: "#100f0f",
      muted: "#6f6e69",
      line: "#100f0f",
      surface: "#f2f0e5",
      "surface-alt": "#e6e4d9",
      border: "#cecdc3",
      accent: "#205ea6",
      critical: "#af3029",
    },
  },
  {
    id: "flexoki-dark",
    title: "Flexoki Dark",
    colors: {
      bg: "#100f0f",
      fg: "#cecdc3",
      muted: "#878580",
      line: "#cecdc3",
      surface: "#1c1b1a",
      "surface-alt": "#282726",
      border: "#6f6e69",
      accent: "#4385be",
      critical: "#d14d41",
    },
  },
];

export function getTheme(id: string) {
  const theme = THEMES.find((theme) => theme.id === id);
  if (!theme) throw new Error(`Unknown diagram theme: ${id}`);
  return theme;
}

export function resolveTheme(id: string, appearance: string) {
  return getTheme(id === "auto" ? (appearance === "dark" ? "dark" : "light") : id).id;
}

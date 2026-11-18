export const BUNDLED_BEAUTIFUL_MERMAID_VERSION = "1.1.3";

export const BEAUTIFUL_MERMAID_THEME_KEYS = [
  "zinc-light",
  "zinc-dark",
  "tokyo-night",
  "tokyo-night-storm",
  "tokyo-night-light",
  "catppuccin-mocha",
  "catppuccin-latte",
  "nord",
  "nord-light",
  "dracula",
  "github-light",
  "github-dark",
  "solarized-light",
  "solarized-dark",
  "one-dark",
] as const;

export function getBundledBeautifulMermaidVersionFallback(version: string | null | undefined): string {
  const normalizedVersion = version?.trim();
  if (!normalizedVersion || normalizedVersion === "unknown") {
    return BUNDLED_BEAUTIFUL_MERMAID_VERSION;
  }

  return normalizedVersion;
}

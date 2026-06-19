import { Color } from "@raycast/api";

// Display label for the tool tag. We keep the internal `tool` field lowercase
// (used for grouping, color lookup, dropdown filter values) and only stylize
// on the way to the UI. Anything not in this map renders as-is.
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  vite: "Vite",
  sveltekit: "SvelteKit",
  svelte: "Svelte",
  astro: "Astro",
  next: "Next.js",
  nuxt: "Nuxt",
  webpack: "Webpack",
  parcel: "Parcel",
  gatsby: "Gatsby",
  remix: "Remix",
  turbo: "Turbo",
  esbuild: "esbuild", // intentionally lowercase per upstream brand
  bun: "Bun",
  node: "Node",
  serve: "Serve",
  "http-server": "http-server", // intentionally lowercase per package name
  "live-server": "Live Server",
  "shopify-theme": "Shopify Theme",
  "shopify-app": "Shopify App",
  "shopify-hydrogen": "Hydrogen",
};

export function toolLabel(tool: string): string {
  return TOOL_DISPLAY_NAMES[tool.toLowerCase()] ?? tool;
}

// Theme-adaptive overrides for the few frameworks where the named palette
// renders too muddy or too low-contrast against Raycast's translucent tag
// background, especially on selected rows in dark mode. The rest fall
// through to the named palette which works fine.
const TOOL_COLOR_OVERRIDES: Record<string, { light: string; dark: string }> = {
  // Purples: deepened in light mode for readable contrast
  vite: { light: "#5B21B6", dark: "#B49CFF" },
  astro: { light: "#5B21B6", dark: "#B49CFF" },
  gatsby: { light: "#5B21B6", dark: "#B49CFF" },
  // Yellows: Raycast's Color.Yellow is too pale in light mode, so use a deeper
  // amber there. Keep a warm yellow in dark mode where it reads fine.
  parcel: { light: "#A16207", dark: "#FDE047" },
  esbuild: { light: "#A16207", dark: "#FDE047" },
  bun: { light: "#A16207", dark: "#FDE047" },
  // Next: Tailwind gray-900 / gray-100 (blue-tinted gray, not neutral)
  next: { light: "#111827", dark: "#F3F4F6" },
};

export function toolColor(
  tool: string,
): Color | { light: string; dark: string } {
  const key = tool.toLowerCase();
  if (TOOL_COLOR_OVERRIDES[key]) return TOOL_COLOR_OVERRIDES[key];
  const colors: Record<string, Color> = {
    nuxt: Color.Green,
    webpack: Color.Blue,
    svelte: Color.Orange,
    sveltekit: Color.Orange,
    remix: Color.Magenta,
    "shopify-theme": Color.Green,
    "shopify-app": Color.Green,
    "shopify-hydrogen": Color.Green,
    turbo: Color.Blue,
    node: Color.Green,
  };
  return colors[key] ?? Color.Blue;
}

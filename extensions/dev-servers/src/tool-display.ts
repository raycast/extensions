import { Color } from "@raycast/api";
import { DevServer, Runtime } from "./types";

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
  wrangler: "Wrangler",
  workerd: "Workerd",
  miniflare: "Miniflare",
  // Outside the JS world (see detectForeignTool in servers.ts).
  "http.server": "http.server", // intentionally lowercase per the Python module
  flask: "Flask",
  django: "Django",
  uvicorn: "Uvicorn",
  gunicorn: "Gunicorn",
  hypercorn: "Hypercorn",
  daphne: "Daphne",
  fastapi: "FastAPI",
  mkdocs: "MkDocs",
  streamlit: "Streamlit",
  python: "Python",
  rails: "Rails",
  puma: "Puma",
  rackup: "Rack",
  jekyll: "Jekyll",
  webrick: "WEBrick",
  ruby: "Ruby",
  php: "PHP",
  laravel: "Laravel",
  symfony: "Symfony",
  deno: "Deno",
  go: "Go",
  air: "Air",
  rust: "Rust",
  trunk: "Trunk",
  dotnet: ".NET",
  hugo: "Hugo",
  zola: "Zola",
  caddy: "Caddy",
  miniserve: "miniserve", // intentionally lowercase per the crate name
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
  // Cloudflare oranges: brand #F38020, deepened in light mode for contrast
  wrangler: { light: "#C2410C", dark: "#F8A15C" },
  workerd: { light: "#C2410C", dark: "#F8A15C" },
  miniflare: { light: "#C2410C", dark: "#F8A15C" },
  // Python blue (brand #3776AB) with the amber tools on the yellow pair
  python: { light: "#1D4ED8", dark: "#7DB3FF" },
  "http.server": { light: "#1D4ED8", dark: "#7DB3FF" },
  django: { light: "#0F5132", dark: "#6EE7B7" }, // Django green
  fastapi: { light: "#0F766E", dark: "#5EEAD4" }, // FastAPI teal
  streamlit: { light: "#B91C1C", dark: "#FCA5A5" },
  // Ruby/Rails red
  rails: { light: "#B91C1C", dark: "#FCA5A5" },
  ruby: { light: "#B91C1C", dark: "#FCA5A5" },
  puma: { light: "#B91C1C", dark: "#FCA5A5" },
  // Laravel red, PHP indigo
  laravel: { light: "#B91C1C", dark: "#FCA5A5" },
  php: { light: "#4338CA", dark: "#A5B4FC" },
  // Rust: the amber pair used for the other warm tools
  rust: { light: "#A16207", dark: "#FDE047" },
  trunk: { light: "#A16207", dark: "#FDE047" },
  // Go cyan
  go: { light: "#0E7490", dark: "#67E8F9" },
  air: { light: "#0E7490", dark: "#67E8F9" },
  // .NET purple: same pair as the Vite family
  dotnet: { light: "#5B21B6", dark: "#B49CFF" },
  // Hugo pink
  hugo: { light: "#BE185D", dark: "#F9A8D4" },
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
    flask: Color.SecondaryText,
    uvicorn: Color.Green,
    gunicorn: Color.Green,
    jekyll: Color.Red,
    webrick: Color.Red,
    deno: Color.SecondaryText,
    caddy: Color.Green,
  };
  return colors[key] ?? Color.Blue;
}

// The runtime badge text for a row, or null when there is nothing worth
// saying: Node (the default), an unknown runtime, or a runtime the tool tag
// already names (tool "bun" on Bun, tool "go" on a Go binary, "php" on PHP).
// Labels come from the tool table so the tag and the badge can never spell a
// language two ways.
export function runtimeTag(server: DevServer): string | null {
  const runtime: Runtime = server.runtime;
  if (runtime === "node" || runtime === "other") return null;
  if (server.tool.toLowerCase() === runtime) return null;
  return toolLabel(runtime);
}

// Same palette as the tool tag of the same name, so a Bun badge and a Bun tag
// are the same yellow.
export function runtimeColor(
  runtime: Runtime,
): Color | { light: string; dark: string } {
  return toolColor(runtime);
}

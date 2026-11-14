import { environment } from "@raycast/api";

// Raycast draws markdown images once and ignores `prefers-color-scheme` inside an
// SVG, so the palette is picked in code from the current appearance. The accents
// are the defaults of the built-in Raycast Dark / Light themes, which keeps the
// charts in step with the native `Color.*` tags in the sidebar.
const isDark = environment.appearance === "dark";

const accents = isDark
  ? { red: "#F84E4E", yellow: "#FFCC47", green: "#4EF8A7", blue: "#228CF6", purple: "#7B4EF8" }
  : { red: "#F50A0A", yellow: "#E0A200", green: "#07BA65", blue: "#0A7FF5", purple: "#470AF5" };

export const theme = {
  isDark,
  text: isDark ? "#ffffff" : "#1a1a1a",
  muted: isDark ? "#8a8a8a" : "#767676",
  faint: isDark ? "#3a3a3a" : "#e6e6e6",
  card: isDark ? "#242424" : "#f4f4f4",
  track: isDark ? "#333333" : "#e4e4e4",
  ...accents,
};

// -apple-system on macOS, Segoe UI on Windows.
export const FONT = `font-family="-apple-system, 'Segoe UI', system-ui, Helvetica, sans-serif"`;

export function svg(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

export function toDataUri(markup: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(markup).toString("base64")}`;
}

/** Markdown image for a generated SVG. `alt` should change whenever the picture does, so Raycast never reuses a stale frame. */
export function markdownImage(markup: string, alt: string, width: number): string {
  return `![${alt}](${toDataUri(markup)}?raycast-width=${width})`;
}

/** Escape text for SVG content and attribute values. */
export function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

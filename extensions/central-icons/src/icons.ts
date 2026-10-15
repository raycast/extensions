import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import type { Pack } from "./pack";

export interface IconMeta {
  title: string;
  category: string;
  createdAt: string;
}

export interface PackData {
  iconNames: string[];
  categories: string[];
  metadata: Record<string, IconMeta>;
  newIconNames: Set<string>;
  iconNamesByCategory: Record<string, string[]>;
}

export interface VariantParts {
  join: "round" | "square";
  fill: "outlined" | "filled";
  radius: string;
  stroke: string;
}

export function variantKeyOf(parts: VariantParts): string {
  return `${parts.join}-${parts.fill}-radius-${parts.radius}-stroke-${parts.stroke}`;
}

const TWO_MONTHS_MS = 62 * 24 * 60 * 60 * 1000;

export function loadPackData(pack: Pack): PackData {
  const { iconNames, categories, metadata } = JSON.parse(
    readFileSync(join(pack.cacheDir, "metadata.json"), "utf8"),
  ) as {
    iconNames: string[];
    categories: string[];
    metadata: Record<string, IconMeta>;
  };

  const iconNamesByCategory: Record<string, string[]> = {};
  for (const name of iconNames) {
    const category = metadata[name].category;
    (iconNamesByCategory[category] ??= []).push(name);
  }

  return {
    iconNames,
    categories,
    metadata,
    newIconNames: new Set(iconNames.filter((n) => Date.now() - Date.parse(metadata[n].createdAt) < TWO_MONTHS_MS)),
    iconNamesByCategory,
  };
}

const variantCache = new Map<string, Record<string, string>>();

/** A `<defs>` holding nothing but a clip rect that covers the whole 24x24 canvas. */
const NOOP_CLIP_DEFS = /<defs><clipPath id="([^"]+)"><rect width="24" height="24"[^/>]*\/><\/clipPath><\/defs>/;

/**
 * Some icons carry a Figma export artefact: every shape is wrapped in
 * `<g clip-path="url(#id)">`, and the `<clipPath>` it points at is declared in a
 * `<defs>` that comes *after* the reference. The clip rect covers the full
 * canvas, so it never clips anything.
 *
 * The website injects this markup into a live DOM `<svg>` and browsers render it
 * fine, but Raycast rasterises a standalone data URI through its own SVG
 * renderer, which resolves the reference to nothing and clips the whole group
 * away — the icon comes out blank (e.g. EyeSlash2, Grok, Parasol, SunHigh,
 * Thunder, LightningBolt).
 *
 * Dropping the wrapper is output-neutral because the clip is a no-op, and it
 * only fires when the `<clipPath>` is exactly a full-canvas rect, so a real clip
 * is left alone.
 */
function stripNoopClipPath(inner: string): string {
  const defs = NOOP_CLIP_DEFS.exec(inner);
  if (!defs) return inner;
  const open = `<g clip-path="url(#${defs[1]})">`;
  const start = inner.indexOf(open);
  if (start === -1) return inner;
  const body = inner.slice(start + open.length, defs.index);
  if (!body.endsWith("</g>")) return inner;
  return inner.slice(0, start) + body.slice(0, -"</g>".length) + inner.slice(defs.index + defs[0].length);
}

export function getVariantIcons(pack: Pack, variant: string): Record<string, string> {
  const cacheKey = `${pack.version}/${variant}`;
  const cached = variantCache.get(cacheKey);
  if (cached) return cached;
  const file = join(pack.cacheDir, `${variant}.json.gz`);
  if (!existsSync(file)) return {};
  const icons = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Record<string, string>;
  for (const name in icons) {
    if (icons[name].includes("clip-path=")) icons[name] = stripNoopClipPath(icons[name]);
  }
  variantCache.set(cacheKey, icons);
  return icons;
}

export function searchTextOf(metadata: Record<string, IconMeta>, name: string): string {
  return `${name} ${metadata[name]?.title ?? ""}`.toLowerCase();
}

const SOCIAL_MEDIA_BRANDS_CATEGORY = "Social Media & Brands";

/** Category order matching the website: alphabetical, Social Media & Brands last. */
export function sortedCategories(categories: string[]): string[] {
  const rest = categories.filter((c) => c !== SOCIAL_MEDIA_BRANDS_CATEGORY).sort((a, b) => a.localeCompare(b, "en"));
  return categories.includes(SOCIAL_MEDIA_BRANDS_CATEGORY) ? [...rest, SOCIAL_MEDIA_BRANDS_CATEGORY] : rest;
}

export function sortIconNames(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, "en"));
}

/** Monthly changelog label matching the website (en-GB, year omitted when current). */
export function monthLabel(date: Date): string {
  const currentYear = new Date().getFullYear();
  return date.toLocaleDateString("en-GB", {
    year: date.getFullYear() === currentYear ? undefined : "numeric",
    month: "long",
  });
}

/** Maps the database name (the metadata title, e.g. "ear, hearing, loud") back
 *  to the icon name — used for semantic search results, like the website. */
export function iconNameByDbName(data: PackData): Map<string, string> {
  return new Map(data.iconNames.map((name) => [data.metadata[name].title, name]));
}

export function buildSvg(inner: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">\n${inner.replace(/currentColor/g, color)}\n</svg>`;
}

export type MaskMode = "masked" | "raw";

/** Wrap an icon's inner SVG in a luminance mask (baked white) so a
 *  semi-transparent color renders uniformly. Mirrors the website's
 *  src/app/_util/maskWrap.ts. */
export function maskWrap(inner: string, maskId: string, mode: MaskMode): string {
  if (mode === "raw") return inner;
  const shapes = inner.replace(/currentColor/g, "#fff");
  return (
    `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">` +
    `<rect width="24" height="24" fill="#000"/>` +
    `<g fill="none">${shapes}</g>` +
    `</mask>` +
    `<rect width="24" height="24" fill="currentColor" mask="url(#${maskId})"/>`
  );
}

export function iconDataUri(inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${inner.replace(/currentColor/g, "#8A8A8E")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

let uriCacheVariant = "";
let uriCache = new Map<string, string>();

/** Memoized per-variant data URIs — base64-encoding 2000+ icons on every
 *  render is too slow, and only one variant is displayed at a time. */
export function iconDataUriFor(variant: string, name: string, inner: string): string {
  if (variant !== uriCacheVariant) {
    uriCacheVariant = variant;
    uriCache = new Map();
  }
  let uri = uriCache.get(name);
  if (!uri) {
    uri = iconDataUri(inner);
    uriCache.set(name, uri);
  }
  return uri;
}

export function reactSnippet(name: string, variant: string, native = false): string {
  const pkg = native ? "@central-icons-react-native" : "@central-icons-react";
  return `import { ${name} } from "${pkg}/${variant}/${name}";

function MyComponent() {
  return <${name} />;
}`;
}

export function solidSnippet(name: string, svg: string): string {
  return `import { JSX } from "solid-js";

export function ${name}(props: JSX.IntrinsicElements["svg"]) {
  return (
    ${svg}
  );
}`;
}

export function vueSnippet(svg: string): string {
  return `<template>
  ${svg}
</template>
`;
}

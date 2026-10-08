import {
  buildHugeiconsWebsiteUrl,
  normalizeSearchStyleValue,
  normalizeSearchValue,
  type HugeiconsIconStyle,
  type SearchResultMeta,
  type SearchStyleValue,
} from "./hugeicons-api";
import { loadConfiguredHugeiconsApiKey } from "./hugeicons-auth";
import { colorSvg, svgToJsx, svgToSvelte, svgToVue } from "./icon-utils";
import { fetchHugeiconsSvg, getHugeiconsIconStyles, searchHugeiconsMetas } from "./hugeicons-source";

export type AiIconCodeFormat = "svg" | "jsx" | "react" | "vue" | "svelte";

export interface AiIconSummary {
  name: string;
  category?: string | null;
  tags: string[];
  availableStyles: HugeiconsIconStyle[];
  url: string;
}

const DEFAULT_TOOL_RESULT_COUNT = 6;
const MAX_TOOL_RESULT_COUNT = 12;

export async function getHugeiconsApiKey(): Promise<string | undefined> {
  return loadConfiguredHugeiconsApiKey();
}

export function resolveToolStyle(style?: string): SearchStyleValue {
  return normalizeSearchStyleValue(style);
}

export function clampToolResultCount(count?: number): number {
  if (!count || Number.isNaN(count)) {
    return DEFAULT_TOOL_RESULT_COUNT;
  }

  return Math.min(Math.max(Math.trunc(count), 1), MAX_TOOL_RESULT_COUNT);
}

export function resolveToolColor(color?: string): string {
  if (!color || color.trim().length === 0 || color === "auto") {
    return "currentColor";
  }

  return color.trim();
}

export function getAvailableStylesFromMeta(meta: SearchResultMeta): HugeiconsIconStyle[] {
  return meta.styles;
}

export function toAiIconSummary(meta: SearchResultMeta): AiIconSummary {
  return {
    name: meta.name,
    category: meta.category,
    tags: meta.tags,
    availableStyles: getAvailableStylesFromMeta(meta),
    url: buildHugeiconsWebsiteUrl(meta.name),
  };
}

export async function resolveIconMetaByName({
  name,
  apiKey,
  signal,
}: {
  name: string;
  apiKey?: string;
  signal: AbortSignal;
}): Promise<{ match?: SearchResultMeta; suggestions: SearchResultMeta[] }> {
  const response = await searchHugeiconsMetas({
    query: name,
    page: 1,
    perPage: MAX_TOOL_RESULT_COUNT,
    apiKey,
    signal,
  });
  const normalizedName = normalizeSearchValue(name);
  const exactMatch = response.items.find((item) => normalizeSearchValue(item.name) === normalizedName);

  if (exactMatch) {
    return {
      match: exactMatch,
      suggestions: response.items.filter((item) => item.name !== exactMatch.name).slice(0, 5),
    };
  }

  return { suggestions: response.items.slice(0, 5) };
}

export async function getAccurateAvailableStyles({
  name,
  apiKey,
  signal,
}: {
  name: string;
  apiKey?: string;
  signal: AbortSignal;
}): Promise<HugeiconsIconStyle[]> {
  const styles = await getHugeiconsIconStyles({ iconName: name, apiKey, signal });

  return styles
    .filter((style): style is { name: HugeiconsIconStyle; svg: string } => style.svg !== null)
    .map((style) => style.name);
}

export function prioritizeStyleMatches(items: SearchResultMeta[], style: SearchStyleValue): SearchResultMeta[] {
  if (style === "default") {
    return items;
  }

  const matching = items.filter((item) => getAvailableStylesFromMeta(item).includes(style));
  const remaining = items.filter((item) => !getAvailableStylesFromMeta(item).includes(style));

  if (matching.length === 0) {
    return items;
  }

  return [...matching, ...remaining];
}

export async function renderIconCode({
  name,
  apiKey,
  signal,
  style,
  format,
  color,
}: {
  name: string;
  apiKey?: string;
  signal: AbortSignal;
  style: SearchStyleValue;
  format: AiIconCodeFormat;
  color?: string;
}): Promise<{
  code: string;
  requestedStyle: SearchStyleValue;
  resolvedStyle: SearchStyleValue;
  format: AiIconCodeFormat;
  color: string;
  url: string;
}> {
  const { svg, resolvedStyle } = await fetchHugeiconsSvg({
    name,
    apiKey,
    signal,
    previewStyle: style,
  });
  const finalColor = resolveToolColor(color);
  const actualStyle = resolvedStyle ?? "default";
  const componentName = actualStyle === "default" ? name : `${name}-${actualStyle}`;

  switch (format) {
    case "svg":
      return {
        code: colorSvg(svg, finalColor),
        requestedStyle: style,
        resolvedStyle: actualStyle,
        format,
        color: finalColor,
        url: buildHugeiconsWebsiteUrl(name),
      };
    case "react":
    case "jsx":
      return {
        code: svgToJsx(svg, componentName, finalColor),
        requestedStyle: style,
        resolvedStyle: actualStyle,
        format,
        color: finalColor,
        url: buildHugeiconsWebsiteUrl(name),
      };
    case "vue":
      return {
        code: svgToVue(svg, componentName, finalColor),
        requestedStyle: style,
        resolvedStyle: actualStyle,
        format,
        color: finalColor,
        url: buildHugeiconsWebsiteUrl(name),
      };
    case "svelte":
      return {
        code: svgToSvelte(svg, componentName, finalColor),
        requestedStyle: style,
        resolvedStyle: actualStyle,
        format,
        color: finalColor,
        url: buildHugeiconsWebsiteUrl(name),
      };
  }
}

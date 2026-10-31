import { FORMATS, Format, IconDetails, IconFile, Source, VariantGroup } from "./types";

export const SOURCE_LABELS: Record<Source, string> = {
  native: "Dashboard Icons",
  selfhst: "selfh.st",
  lobehub: "LobeHub",
  simpleicons: "Simple Icons",
};

export const FORMAT_LABELS: Record<Format, string> = {
  webp: "WebP",
  png: "PNG",
  svg: "SVG",
};

const KNOWN_VARIANTS: { key: string; label: string; hint?: string }[] = [
  { key: "default", label: "Base" },
  { key: "light", label: "Light", hint: "For dark backgrounds" },
  { key: "dark", label: "Dark", hint: "For light backgrounds" },
  { key: "wordmark", label: "Wordmark" },
  { key: "wordmark-light", label: "Wordmark Light", hint: "For dark backgrounds" },
  { key: "wordmark-dark", label: "Wordmark Dark", hint: "For light backgrounds" },
];

export function variantLabel(key: string): string {
  const known = KNOWN_VARIANTS.find((variant) => variant.key === key);
  if (known) return known.label;
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => (/^\d/.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

function variantRank(key: string): number {
  const index = KNOWN_VARIANTS.findIndex((variant) => variant.key === key);
  return index === -1 ? KNOWN_VARIANTS.length : index;
}

/** Formats in display order: the preferred format first, then WebP, PNG, SVG. */
export function orderedFormats(preferred: Format): Format[] {
  return [preferred, ...FORMATS.filter((format) => format !== preferred)];
}

function sanitizeFileName(value: string): string {
  // Separators become dashes; leading dots and dashes are dropped so a name can never be hidden or relative.
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[.-]+|-+$/g, "") || "icon";
}

/**
 * File name for a downloaded icon, derived from the icon instead of the URL: "portabase-dark.webp" for
 * Dashboard Icons, "githubpages-simpleicons-light.png" for external catalogs. Some catalogs serve generic
 * names (Simple Icons: "brand.png", and "dark.png" for the light variant), which would be misleading and
 * would let copies of different icons overwrite each other. Each icon, source, variant and format
 * combination therefore gets its own name.
 */
export function fileNameFor(icon: Pick<IconDetails, "name" | "source">, variant: string, format: Format): string {
  const base = icon.source === "native" ? icon.name : `${icon.name}-${icon.source}`;
  const suffix = variant === "default" ? "" : `-${variant}`;
  return `${sanitizeFileName(`${base}${suffix}`)}.${format}`;
}

/** Groups every available file of an icon by variant, ordered Base, Light, Dark, wordmarks, then custom variants. */
export function groupIconFiles(icon: IconDetails, preferred: Format = "webp"): VariantGroup[] {
  const variants = new Set<string>();
  for (const format of FORMATS) {
    for (const variant of Object.keys(icon.urls[format] ?? {})) variants.add(variant);
  }

  return [...variants]
    .sort((a, b) => variantRank(a) - variantRank(b) || a.localeCompare(b))
    .map((variant) => {
      const files: IconFile[] = [];
      for (const format of orderedFormats(preferred)) {
        const url = icon.urls[format]?.[variant];
        if (url) files.push({ variant, format, url, fileName: fileNameFor(icon, variant, format) });
      }
      const known = KNOWN_VARIANTS.find((entry) => entry.key === variant);
      return { variant, label: variantLabel(variant), hint: known?.hint, files };
    })
    .filter((group) => group.files.length > 0);
}

/** The file used by quick actions: the base variant in the preferred format, falling back to any available file. */
export function primaryFile(icon: IconDetails, preferred: Format = "webp"): IconFile | undefined {
  const groups = groupIconFiles(icon, preferred);
  return groups.find((group) => group.variant === "default")?.files[0] ?? groups[0]?.files[0];
}

export function availableFormats(icon: IconDetails): Format[] {
  return FORMATS.filter((format) => Object.keys(icon.urls[format] ?? {}).length > 0);
}

const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

/** Display name as on dashboardicons.com: lowercase slugs like "home assistant" become "Home Assistant". */
export function displayTitle(icon: Pick<IconDetails, "title">): string {
  if (icon.title !== icon.title.toLowerCase()) return icon.title;
  return icon.title.replace(
    /(^|[\s-])(\p{L})/gu,
    (_, separator: string, letter: string) => separator + letter.toUpperCase(),
  );
}

/**
 * Where to credit the icon's author. Native icons are contributed through GitHub, so their author is a
 * GitHub login and links to the profile like on dashboardicons.com; external icons link to their catalog.
 */
export function authorUrl(icon: IconDetails): string | undefined {
  if (!icon.author) return undefined;
  if (icon.source === "native") {
    return GITHUB_LOGIN.test(icon.author) ? `https://github.com/${icon.author}` : undefined;
  }
  return icon.license?.providerUrl || undefined;
}

/** Format of the base file, taken from the preview URL (the website calls this the "base format"). */
export function baseFormat(icon: IconDetails): Format | undefined {
  const match = icon.previewUrl.match(/\.(svg|png|webp)(?:$|[?#])/i);
  return match ? (match[1].toLowerCase() as Format) : undefined;
}

/** The "About this icon" text of dashboardicons.com, built from the same data. */
export function aboutIcon(icon: IconDetails): string[] {
  const formats = (["svg", "png", "webp"] as const).filter((format) => availableFormats(icon).includes(format));
  const variants = new Set(Object.values(icon.urls).flatMap((byVariant) => Object.keys(byVariant ?? {})));
  const base = baseFormat(icon);

  let summary =
    formats.length > 1
      ? `Available in ${formats.length} formats (${formats.map((format) => format.toUpperCase()).join(", ")})`
      : `Available in ${formats[0]?.toUpperCase() ?? "no"} format`;
  summary += base ? ` with a base format of ${base.toUpperCase()}.` : ".";
  if (variants.has("light") || variants.has("dark")) {
    summary += " Includes both light and dark theme variants for better integration with different UI designs.";
  }
  if ([...variants].some((variant) => variant.startsWith("wordmark"))) {
    summary += " Wordmark variants are also available for enhanced branding options.";
  }

  const paragraphs = [
    summary,
    `Perfect for adding to dashboards, app directories, documentation, or anywhere you need the ${displayTitle(icon)} logo.`,
  ];
  if (icon.source !== "native") paragraphs.push(`External icon provided by ${SOURCE_LABELS[icon.source]}.`);
  return paragraphs;
}

/** "24 August 2026" style date, or undefined for missing or invalid input. */
export function formatDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

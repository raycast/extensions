export const DEFAULT_TAG_COLOR = "SecondaryText" as const;

export const TAG_COLOR_OPTIONS = [
  DEFAULT_TAG_COLOR,
  "Blue",
  "Green",
  "Magenta",
  "Orange",
  "Purple",
  "Red",
  "Yellow",
] as const;

export type TagColorName = (typeof TAG_COLOR_OPTIONS)[number];
export type TagColorValue = TagColorName | string;
export type TagColorsByTag = Record<string, TagColorValue>;

const supportedTagColors = new Set<string>(TAG_COLOR_OPTIONS);
const cssNamedColors = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "transparent",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
]);

export function normalizeTagColors(
  raw: unknown,
  tags: string[],
): TagColorsByTag {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const knownTags = new Set(tags);
  const colors = raw as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(colors).flatMap(([tag, color]) => {
      const normalized = knownTags.has(tag)
        ? normalizeTagColor(color)
        : undefined;
      return normalized ? [[tag, normalized]] : [];
    }),
  );
}

export function tagColorFor(
  tag: string,
  colors: TagColorsByTag,
): TagColorValue {
  return colors[tag] ?? DEFAULT_TAG_COLOR;
}

export function normalizeTagColor(color: unknown): TagColorValue | undefined {
  if (typeof color !== "string") {
    return undefined;
  }

  const trimmed = color.trim();
  if (
    !trimmed ||
    trimmed.toLocaleLowerCase() === "default" ||
    trimmed === DEFAULT_TAG_COLOR
  ) {
    return undefined;
  }

  if (supportedTagColors.has(trimmed)) {
    return trimmed;
  }

  const hex = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    return `#${hex[1].toUpperCase()}`;
  }

  const namedColor = trimmed.toLocaleLowerCase();
  if (cssNamedColors.has(namedColor)) {
    return namedColor;
  }

  if (isRgbColor(trimmed)) {
    return trimmed.replace(/\s+/g, " ");
  }

  return undefined;
}

function isRgbColor(color: string): boolean {
  const match = color.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
  if (!match) {
    return false;
  }

  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length !== 3 && parts.length !== 4) {
    return false;
  }

  return parts.every((part, index) =>
    index < 3 ? isRgbChannel(part) : isAlphaChannel(part),
  );
}

function isRgbChannel(value: string): boolean {
  const channel = Number(value);
  return Number.isInteger(channel) && channel >= 0 && channel <= 255;
}

function isAlphaChannel(value: string): boolean {
  const alpha = Number(value);
  return Number.isFinite(alpha) && alpha >= 0 && alpha <= 1;
}

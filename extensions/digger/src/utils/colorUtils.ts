/**
 * CSS colour values → `#rrggbb`, so a swatch can be drawn for them.
 *
 * Raycast's `tintColor` accepts hex (or one of its own named colours) and
 * nothing else, so every value a modern stylesheet actually uses — `oklch()`,
 * `lab()`, `color(display-p3 …)` — renders as an empty circle unless it is
 * converted here. Tailwind v4 ships its entire palette as `oklch()`, which is
 * why a Tailwind site showed ~200 tokens and almost no swatches.
 *
 * Values outside the sRGB gamut are clipped per channel. That is a lie about the
 * colour, but a small and visible one — the row still prints the exact declared
 * value next to the swatch, so nothing is lost, and a P3 green rendered as the
 * nearest sRGB green is far more informative than a blank circle.
 */

/** The 148 CSS named colours, plus `transparent`. */
const NAMED: Record<string, string> = {
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  black: "#000000",
  blanchedalmond: "#ffebcd",
  blue: "#0000ff",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  gray: "#808080",
  green: "#008000",
  greenyellow: "#adff2f",
  grey: "#808080",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  magenta: "#ff00ff",
  maroon: "#800000",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  navy: "#000080",
  oldlace: "#fdf5e6",
  olive: "#808000",
  olivedrab: "#6b8e23",
  orange: "#ffa500",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#ff0000",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  silver: "#c0c0c0",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  teal: "#008080",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  white: "#ffffff",
  whitesmoke: "#f5f5f5",
  yellow: "#ffff00",
  yellowgreen: "#9acd32",
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Linear-light channel → sRGB gamma-encoded. */
function gamma(channel: number): number {
  const abs = Math.abs(channel);
  const encoded = abs <= 0.0031308 ? channel * 12.92 : Math.sign(channel) * (1.055 * abs ** (1 / 2.4) - 0.055);
  return clamp01(encoded);
}

function toHexString(r: number, g: number, b: number, alpha = 1): string {
  const byte = (n: number) =>
    Math.round(clamp01(n) * 255)
      .toString(16)
      .padStart(2, "0");
  // Alpha is carried through as an 8-digit value rather than dropped. Discarding
  // it here made `rgba(255,0,0,.5)` indistinguishable from opaque red by the time
  // it reached the swatch, defeating the hollow-indicator branch that exists
  // precisely for translucent colours.
  const rgb = `#${byte(r)}${byte(g)}${byte(b)}`;
  return alpha >= 1 ? rgb : `${rgb}${byte(alpha)}`;
}

/** The alpha argument of a functional colour, after the `/` or as a 4th value. */
function alphaOf(body: string): number {
  const slash = body.split("/");
  if (slash.length > 1) {
    const raw = slash[1].trim();
    if (raw === "" || raw === "none") return 1;
    return raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
  }
  const parts = body
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 4) return 1;
  const raw = parts[3];
  return raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
}

/** Splits `oklch(1 2 3 / .5)` into its numeric arguments, alpha discarded. */
function args(body: string): string[] {
  return body
    .split("/")[0]
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
}

/** `50%` → 0.5 scaled by `full`; a bare number passes through. */
function num(token: string | undefined, full = 1): number {
  if (token === undefined) return 0;
  if (token === "none") return 0;
  const value = parseFloat(token);
  if (Number.isNaN(value)) return 0;
  return token.endsWith("%") ? (value / 100) * full : value;
}

/** OKLab → linear sRGB. Björn Ottosson's matrices. */
function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** CIE Lab (D50, as CSS specifies) → linear sRGB, Bradford-adapted. */
function labToLinear(L: number, a: number, b: number): [number, number, number] {
  const e = 216 / 24389;
  const k = 24389 / 27;

  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const xr = fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k;
  const yr = L > k * e ? fy ** 3 : L / k;
  const zr = fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k;

  // D50 reference white, which is the white point CSS `lab()`/`lch()` are
  // defined against — not D65.
  const x = (xr * 0.3457) / 0.3585;
  const y = yr;
  const z = (zr * (1 - 0.3457 - 0.3585)) / 0.3585;

  // XYZ(D50) → linear sRGB, Bradford-adapted.
  return [
    3.1341359569958707 * x - 1.6173863321612538 * y - 0.4906619460083532 * z,
    -0.978795502912089 * x + 1.9161404708982475 * y + 0.033402271479256 * z,
    0.07195537988411677 * x - 0.2289768264158322 * y + 1.4053521429917335 * z,
  ];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
}

/**
 * Converts any CSS colour value to `#rrggbb`, or undefined when it is not a
 * colour at all.
 *
 * Undefined is the honest answer for a system keyword (`Canvas`, `currentColor`)
 * — its rendered value depends on context this has no access to, and inventing
 * one would be a fabricated colour presented as the site's.
 */
export function toHex(input: string): string | undefined {
  const value = input.trim().toLowerCase();
  if (value === "") return undefined;

  if (NAMED[value]) return NAMED[value];

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (/^[0-9a-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    if (/^[0-9a-f]{4}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;
    if (/^[0-9a-f]{8}$/.test(hex)) return `#${hex}`;
    return undefined;
  }

  const call = /^([a-z-]+)\((.*)\)$/s.exec(value);
  if (!call) return undefined;
  const [, fn, body] = call;
  // A nested function (`hsl(var(--x))`, `color-mix(...)`) is not resolvable here;
  // the caller resolves `var()` before this point.
  if (/\bvar\(/.test(body)) return undefined;
  const parts = args(body);

  switch (fn) {
    case "rgb":
    case "rgba": {
      const scale = (t: string) => (t.endsWith("%") ? num(t, 1) : num(t) / 255);
      return toHexString(scale(parts[0]), scale(parts[1]), scale(parts[2]), alphaOf(body));
    }
    case "hsl":
    case "hsla": {
      const [r, g, b] = hslToRgb(num(parts[0]), num(parts[1], 1), num(parts[2], 1));
      return toHexString(r, g, b, alphaOf(body));
    }
    case "oklch": {
      const L = num(parts[0], 1);
      const C = num(parts[1], 0.4);
      const h = (num(parts[2]) * Math.PI) / 180;
      const [r, g, b] = oklabToLinear(L, C * Math.cos(h), C * Math.sin(h));
      return toHexString(gamma(r), gamma(g), gamma(b), alphaOf(body));
    }
    case "oklab": {
      const [r, g, b] = oklabToLinear(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4));
      return toHexString(gamma(r), gamma(g), gamma(b), alphaOf(body));
    }
    case "lch": {
      const L = num(parts[0], 100);
      const C = num(parts[1], 150);
      const h = (num(parts[2]) * Math.PI) / 180;
      const [r, g, b] = labToLinear(L, C * Math.cos(h), C * Math.sin(h));
      return toHexString(gamma(r), gamma(g), gamma(b), alphaOf(body));
    }
    case "lab": {
      const [r, g, b] = labToLinear(num(parts[0], 100), num(parts[1], 125), num(parts[2], 125));
      return toHexString(gamma(r), gamma(g), gamma(b), alphaOf(body));
    }
    case "color": {
      // `color(srgb r g b)` and `color(display-p3 r g b)`. P3 primaries are wider
      // than sRGB, so a saturated P3 colour clips — deliberately, see the header.
      const space = parts[0];
      const [r, g, b] = [num(parts[1]), num(parts[2]), num(parts[3])];
      if (space === "srgb") return toHexString(r, g, b);
      if (space === "srgb-linear") return toHexString(gamma(r), gamma(g), gamma(b));
      if (space === "display-p3") {
        const lin = (c: number) =>
          Math.abs(c) <= 0.04045 ? c / 12.92 : Math.sign(c) * ((Math.abs(c) + 0.055) / 1.055) ** 2.4;
        const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
        return toHexString(
          gamma(1.2249401762 * lr - 0.2249401762 * lg),
          gamma(-0.0420569547 * lr + 1.0420569547 * lg),
          gamma(-0.0196375546 * lr - 0.0786360454 * lg + 1.0982736 * lb),
        );
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

/** True when the value names a colour we could draw, once `var()` is resolved. */
export function isColorValue(value: string): boolean {
  return toHex(value) !== undefined;
}

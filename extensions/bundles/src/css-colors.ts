/**
 * CSS color name to hex mapping
 * Standard CSS named colors for user-friendly color input
 */
export const CSS_COLORS: Record<string, string> = {
  // Basic colors
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  // Extended colors
  gray: "#808080",
  grey: "#808080",
  silver: "#C0C0C0",
  maroon: "#800000",
  olive: "#808000",
  lime: "#00FF00",
  aqua: "#00FFFF",
  teal: "#008080",
  navy: "#000080",
  fuchsia: "#FF00FF",
  purple: "#800080",
  // Common web colors
  orange: "#FFA500",
  pink: "#FFC0CB",
  brown: "#A52A2A",
  coral: "#FF7F50",
  crimson: "#DC143C",
  gold: "#FFD700",
  indigo: "#4B0082",
  ivory: "#FFFFF0",
  khaki: "#F0E68C",
  lavender: "#E6E6FA",
  lightblue: "#ADD8E6",
  lightgreen: "#90EE90",
  lightgray: "#D3D3D3",
  lightgrey: "#D3D3D3",
  lightpink: "#FFB6C1",
  lightyellow: "#FFFFE0",
  mintcream: "#F5FFFA",
  mistyrose: "#FFE4E1",
  moccasin: "#FFE4B5",
  orchid: "#DA70D6",
  peachpuff: "#FFDAB9",
  peru: "#CD853F",
  plum: "#DDA0DD",
  powderblue: "#B0E0E6",
  salmon: "#FA8072",
  sandybrown: "#F4A460",
  seagreen: "#2E8B57",
  sienna: "#A0522D",
  skyblue: "#87CEEB",
  slateblue: "#6A5ACD",
  slategray: "#708090",
  slategrey: "#708090",
  springgreen: "#00FF7F",
  steelblue: "#4682B4",
  tan: "#D2B48C",
  thistle: "#D8BFD8",
  tomato: "#FF6347",
  turquoise: "#40E0D0",
  violet: "#EE82EE",
  wheat: "#F5DEB3",
  darkblue: "#00008B",
  darkcyan: "#008B8B",
  darkgray: "#A9A9A9",
  darkgrey: "#A9A9A9",
  darkgreen: "#006400",
  darkmagenta: "#8B008B",
  darkorange: "#FF8C00",
  darkred: "#8B0000",
  darkviolet: "#9400D3",
  deeppink: "#FF1493",
  deepskyblue: "#00BFFF",
  dodgerblue: "#1E90FF",
  firebrick: "#B22222",
  forestgreen: "#228B22",
  hotpink: "#FF69B4",
  indianred: "#CD5C5C",
  limegreen: "#32CD32",
  mediumblue: "#0000CD",
  mediumpurple: "#9370DB",
  mediumseagreen: "#3CB371",
  midnightblue: "#191970",
  orangered: "#FF4500",
  palegreen: "#98FB98",
  palevioletred: "#DB7093",
  royalblue: "#4169E1",
  saddlebrown: "#8B4513",
  seashell: "#FFF5EE",
  snow: "#FFFAFA",
  yellowgreen: "#9ACD32",
};

/**
 * Check if a string is a valid CSS color name
 */
export function isCssColorName(color: string): boolean {
  return CSS_COLORS[color.toLowerCase()] !== undefined;
}

/**
 * Get hex code for a CSS color name
 */
export function cssColorToHex(color: string): string | undefined {
  return CSS_COLORS[color.toLowerCase()];
}

/**
 * Validate color format (hex with or without #, or CSS color name)
 */
export function isValidHexColor(color: string): boolean {
  if (!color) return false;
  // Check for CSS color name first
  if (isCssColorName(color)) return true;
  // Check for hex format
  return /^#?([0-9A-Fa-f]{3}){1,2}$/.test(color);
}

/**
 * Normalize color to full 6-digit hex format with # prefix
 * Accepts: hex (with/without #), shorthand hex (#CCC), CSS color names
 * Examples: "red" → "#FF0000", "CCC" → "#CCCCCC", "#ABC" → "#AABBCC"
 */
export function normalizeHexColor(color: string): string {
  if (!color) return color;

  // Check for CSS color name first
  const cssHex = cssColorToHex(color);
  if (cssHex) return cssHex;

  // Add # prefix if missing
  let hex = color.startsWith("#") ? color : `#${color}`;

  // Expand shorthand hex (#RGB → #RRGGBB)
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }

  // Uppercase for consistency
  return hex.toUpperCase();
}

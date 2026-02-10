// Cache for expensive SVG encoding operations
const svgCache = new Map<string, { light: string; dark: string }>();

// Are we in Windows?
const isWindows = process.platform === "win32";

/**
 * Returns a SVG string for a square with the given value
 * @param value The value to display in the square
 * @param dark Should the square be dark?
 * @returns SVG string for a square with the given value
 */
const getSquareSVGString = (value: string, dark = false) => {
  let val = value;
  if (value === "&") {
    val = "&amp;";
  } else if (value === "<") {
    val = "&lt;";
  } else if (value === ">") {
    val = "&gt;";
  }
  const textColor = dark ? "#fff" : "#000";
  const size = 200;

  // For Windows we need to use different values to make it working...
  const fontFamily = isWindows ? "Consolas, monospace" : "Menlo, monospace";
  const textY = isWindows ? size / 2 : size / 1.3;

  return `
  <svg height="${size}" width="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect fill="transparent" x="0" y="0" width="${size}" height="${size}"></rect>
    <text x="${size / 2}" y="${
      textY
    }" fill="${textColor}" text-anchor="middle" alignment-baseline="central" font-size="${
      size / 2
    }" line-height="0" font-family="${fontFamily}">${val}</text>
  </svg>
  `;
};

/**
 * Encode a string to base64
 * @param str Input string
 * @returns The input string encoded to base64
 */
const encode = (str: string) => Buffer.from(str).toString("base64");

/**
 * Encode a SVG string to base64 image string with caching
 * @param str Input string
 * @param dark Should the square be dark?
 * @returns The input string encoded to base64
 */
export const encodeSVG = (str: string, dark = false) => {
  const cacheKey = str;
  let cached = svgCache.get(cacheKey);

  if (!cached) {
    const lightEncoded = `data:image/svg+xml;base64,${encode(getSquareSVGString(str, false))}`;
    const darkEncoded = `data:image/svg+xml;base64,${encode(getSquareSVGString(str, true))}`;
    cached = { light: lightEncoded, dark: darkEncoded };
    svgCache.set(cacheKey, cached);
  }

  return dark ? cached.dark : cached.light;
};

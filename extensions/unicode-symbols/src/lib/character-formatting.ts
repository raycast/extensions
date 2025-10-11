import { useMemo } from "react";
import type { Character } from "@/types";

// Cache for expensive SVG encoding operations
const svgCache = new Map<string, { light: string; dark: string }>();

// Are we in Windows?
const isWindows = process.platform === "win32";

/**
 * Utility to uppercase only the first character of a given string
 * @param str Input string
 * @returns The input string with only the first character uppercased
 */
export const upperCaseFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert number to hex string with padding
 * @param number Input number
 * @returns Hex string with 4-digit padding
 */
export const numberToHex = (number: number): string => {
  return number.toString(16).padStart(4, "0").toUpperCase();
};

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
  const fontFamily = isWindows ? "monospace" : "mono-space";
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
  const cacheKey = `${str}-${dark}`;
  const cached = svgCache.get(cacheKey);

  if (cached) {
    return dark ? cached.dark : cached.light;
  }

  const encoded = `data:image/svg+xml;base64,${encode(getSquareSVGString(str, dark))}`;

  // Cache both light and dark versions
  if (!svgCache.has(`${str}-false`)) {
    const lightEncoded = `data:image/svg+xml;base64,${encode(getSquareSVGString(str, false))}`;
    const darkEncoded = `data:image/svg+xml;base64,${encode(getSquareSVGString(str, true))}`;
    svgCache.set(cacheKey, { light: lightEncoded, dark: darkEncoded });
  }

  return encoded;
};

/**
 * Hook for character formatting with memoization
 * @param character Character to format
 * @returns Formatted character data
 */
export const useCharacterFormatting = (character: Character) => {
  return useMemo(() => {
    const hex = numberToHex(character.c);
    const unicodeEscape = `\\u${hex}`;
    const htmlDecimal = `&#${character.c};`;

    // Get cached SVG encodings
    const lightSvg = encodeSVG(character.v, false);
    const darkSvg = encodeSVG(character.v, true);

    return {
      hex,
      unicodeEscape,
      htmlDecimal,
      lightSvg,
      darkSvg,
      formattedName: upperCaseFirst(character.n),
      formattedAliases: character.a.map(upperCaseFirst),
    };
  }, [character.c, character.v, character.n, character.a]);
};

/**
 * Format character tooltip with all relevant information
 * @param character Character to format
 * @param section Section name (optional)
 * @param filter Current filter (optional)
 * @param htmlEntity HTML entity (optional)
 * @returns Formatted tooltip string
 */
export const formatCharacterTooltip = (
  character: Character,
  section?: string,
  filter?: string | null,
  htmlEntity?: string | null,
): string => {
  const { formattedName, hex } = useCharacterFormatting(character);

  return [
    `Name: ${formattedName}`,
    `Dec: ${character.c}`,
    `Hex: ${hex}`,
    filter === null && typeof section !== "undefined" ? `Section: ${section}` : "",
    htmlEntity ? `HTML Entity: ${htmlEntity}` : "",
    character.a?.length ? `Aliases: "${character.a.map(upperCaseFirst).join(", ")}"` : "",
    character.u ? `Unicode Version: ${character.u}` : "",
    character.m ? `Mirror Code: ${character.m}` : "",
    ...(character.isExtra ? [" ", "> Note: This character is actually in a different Character Set"] : [""]),
  ]
    .filter((s) => s.length > 0)
    .join("\n");
};

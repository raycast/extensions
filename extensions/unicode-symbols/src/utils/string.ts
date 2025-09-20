import type { Character, CharacterSection } from "@/types";

/**
 * Utility to uppercase only the first character of a given string
 * @param str Input string
 * @returns The input string with only the first character uppercased
 */
export const upperCaseFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const numberToHex = (number: number): string => {
  return number.toString(16).padStart(4, "0").toUpperCase();
};

/**
 * Returns a SVG string for a square with the given value
 * @param value The value to display in the square
 * @param dark Should the square be dark?
 * @returns SVG string for a square with the given value
 */
export const getSquareSVGString = (value: string, dark = false) => {
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
  return `
  <svg height="${size}" width="${size}">
    <rect fill="transparent" x="0" y="0" width="${size}" height="${size}"></rect>
    <text x="${size / 2}" y="${
      size / 1.3
    }" fill="${textColor}" text-anchor="middle" alignment-baseline="central" font-size="${
      size / 2
    }" line-height="0" font-family="mono-space">${val}</text>
  </svg>
  `;
};

// Raycast is breaking on certain character sets in List Mode, so we filter the value and subtitle

export const getFilteredValue = (item: Character, section: CharacterSection): string => {
  if (section.sectionTitle === "Ancient Symbols") {
    return "?";
  }
  return item.v;
};

export const getFilteredSubtitle = (item: Character, section: CharacterSection): string => {
  const subTitle = upperCaseFirst(item.n);
  if (section.sectionTitle === "Ancient Symbols") {
    return `${subTitle} (see in Grid Mode)`;
  }
  return subTitle;
};

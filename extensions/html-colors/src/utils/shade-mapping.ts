import { Color } from "../constants";
import { ColorResult } from "../utils/search-utils";

/**
 * Represents a shade category for HTML colors
 */
export type ShadeCategory = 
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "brown"
  | "purple"
  | "indigo"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "lime"
  | "mint"
  | "white"
  | "gray"
  | "black";

/**
 * Static order of shade categories for consistent sorting
 */
export const SHADE_ORDER: ShadeCategory[] = [
  "black",
  "blue",
  "brown",
  "cyan",
  "gray",
  "green",
  "indigo",
  "lime",
  "mint",
  "orange",
  "pink",
  "purple",
  "red",
  "teal",
  "white",
  "yellow"
];

const EMPTY_GROUPS: Record<ShadeCategory, ColorResult[]> = Object.freeze({
  pink: [],
  red: [],
  orange: [],
  yellow: [],
  brown: [],
  purple: [],
  indigo: [],
  blue: [],
  cyan: [],
  teal: [],
  green: [],
  lime: [],
  mint: [],
  white: [],
  gray: [],
  black: [],
});

/**
 * Group colors by their shade categories
 */
export function groupColorsByShade(colors: ColorResult[]): Record<ShadeCategory, ColorResult[]> {
  return colors.reduce((groups, color) => ({
    ...groups,
    [color.shade]: [...groups[color.shade], color]
  }), { ...EMPTY_GROUPS });
} 
import { Color } from "./constants";

/**
 * Represents a color with multiple categories instead of a single category field
 */
export type ColorWithCategories = Omit<Color, "category"> & {
  categories: Color["category"][];
};

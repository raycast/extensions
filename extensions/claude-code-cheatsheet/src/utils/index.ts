import { Command, ThinkingKeyword } from "../types";

/**
 * Type guard function to determine if an item is of Command type
 * Excludes thinking category as it is treated as ThinkingKeyword
 */
export const isCommand = (item: Command | ThinkingKeyword): item is Command => {
  return "category" in item && item.category !== "thinking";
};

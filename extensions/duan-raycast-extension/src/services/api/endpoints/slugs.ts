import { fetchWithAuth } from "../client";

/**
 * Get all used shortcodes
 * @returns Promise<string[]> An array of shortcode strings
 */
export const getShortcodes = async (): Promise<string[]> => {
  return fetchWithAuth<string[]>("/api/shortcodes", { method: "GET" });
};

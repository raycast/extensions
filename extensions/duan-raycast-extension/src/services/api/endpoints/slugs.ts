import { fetchWithAuth } from "../client";

/**
 * 获取所有已使用的 shortcodes
 * @returns Promise<string[]> shortcode 字符串数组
 */
export const getShortcodes = async (): Promise<string[]> => {
  return fetchWithAuth<string[]>("/api/shortcodes", { method: "GET" });
};

/**
 * General utility functions
 */
import { UI_CONFIG } from "../constants/config";

/**
 * Truncate text for HUD display
 */
export function truncateForHud(text: string, maxLength: number = UI_CONFIG.hudTextMaxLength): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

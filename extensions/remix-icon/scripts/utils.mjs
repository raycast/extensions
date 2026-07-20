/**
 * Shared utility functions for Node.js scripts.
 * Duplicates the logic from src/utils.ts but without Raycast dependencies.
 */

/**
 * Converts a kebab-case or snake_case string to PascalCase.
 * Examples:
 *   - "arrow-down-fill" → "ArrowDownFill"
 *   - "24-hours" → "24Hours"
 *   - "user_name" → "UserName"
 * 
 * @param {string} string - The string to convert
 * @returns {string} PascalCase version of the string
 */
export function toUpperCamelCase(string) {
  const camelCase = string.replaceAll(/[-_]\w/gi, (m) => m[1].toUpperCase());
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * Converts an icon name to its React component name.
 * Follows the official @remixicon/react naming convention: "Ri" prefix + PascalCase.
 * Examples:
 *   - "heart-fill" → "RiHeartFill"
 *   - "24-hours-fill" → "Ri24HoursFill"
 *   - "arrow-down-line" → "RiArrowDownLine"
 * 
 * @param {string} iconName - The kebab-case icon name
 * @returns {string} React component name with "Ri" prefix
 */
export function toReactComponentName(iconName) {
  return "Ri" + toUpperCamelCase(iconName);
}

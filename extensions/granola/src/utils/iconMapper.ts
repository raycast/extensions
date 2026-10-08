/**
 * Converts PascalCase to kebab-case
 * Example: "PresentationChartBarIcon" -> "presentation-chart-bar"
 */
function pascalToKebab(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1") // Add dash before uppercase letters
    .toLowerCase() // Convert to lowercase
    .replace(/^-/, ""); // Remove leading dash
}

/**
 * Maps Granola icon names to local SVG files
 * Converts from PascalCase (e.g., "PresentationChartBarIcon") to kebab-case SVG files (e.g., "icons/presentation-chart-bar.svg")
 * @param iconName The icon name from Granola API (e.g., "PresentationChartBarIcon")
 * @returns The filename of the local SVG icon with subfolder path
 */
export function mapIconToHeroicon(iconName: string): string {
  if (!iconName) return getDefaultIconUrl();

  // Remove "Icon" suffix and convert to kebab-case
  const withoutIconSuffix = iconName.replace(/Icon$/i, "");
  const kebabCase = pascalToKebab(withoutIconSuffix);
  return `icons/${kebabCase}.svg`;
}

/**
 * Get the default icon filename
 * @returns Default icon filename with subfolder path
 */
export function getDefaultIconUrl(): string {
  return "icons/folder.svg";
}

/**
 * Maps Granola color names to hex colors for tinting
 * @param colorName The color name from Granola API
 * @returns The hex color code
 */
export function mapColorToHex(colorName: string): string {
  const normalized = colorName?.toLowerCase() || "";

  // Direct mapping to hex colors based on the Granola UI color picker
  const colorMap: Record<string, string> = {
    // Neutrals
    default: "#818179", // oats-neutral-500
    gray: "#818179", // oats-neutral-500
    slate: "#4E4D4B", // oats-neutral-700
    black: "#4E4D4B", // oats-neutral-700

    // Chromatics
    violet: "#A291CE", // oats-purple-300
    blue: "#4790E2", // oats-blue-300
    teal: "#788C16", // oats-green-400 (no teal in new palette)
    lime: "#788C16", // oats-green-400
    amber: "#EE9212", // oats-yellow-300
    tertiary: "#B89F56", // oats-gold-300
    red: "#EA5D3D", // oats-red-300
  };

  return colorMap[normalized] || "#818179";
}

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

  // Direct mapping to hex colors based on the UI color picker
  const colorMap: Record<string, string> = {
    default: "#64748B",
    violet: "#8B5CF6",
    blue: "#3B82F6",
    teal: "#14B8A6",
    lime: "#65A30D",
    amber: "#F59E0B",
    red: "#EF4444",
    tertiary: "#F1F5F9",
    slate: "#64748B",
    black: "#475569",
    gray: "#868686",
  };

  return colorMap[normalized] || "#64748B";
}

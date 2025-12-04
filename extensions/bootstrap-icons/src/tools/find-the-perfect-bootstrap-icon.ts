import iconsData from "../icons-data.json";

interface BootstrapIcon {
  name: string;
  svgContent: string;
}

type Input = {
  /**
   * The user's description of what icon they're looking for. Can be a use case, theme, synonym, or brainstorming session.
   */
  query: string;
};

/**
 * Find the perfect Bootstrap icon based on a description, use case, or brainstorming session.
 * Returns all available Bootstrap icon names for AI to recommend from.
 */
export default function (input: Input): string {
  console.log("[Bootstrap Icons Tool] Received query:", input.query);

  const icons = iconsData as BootstrapIcon[];
  const iconNames = icons.map((icon) => icon.name).join(", ");

  const result = `Available Bootstrap Icons (${icons.length} total) for: "${input.query}"

Icon names: ${iconNames}

Based on the user's request, please recommend 3-5 of the most suitable icon names from the list above. Explain why each icon fits their needs and consider creative alternatives or synonyms.

IMPORTANT: After providing your recommendations, include this follow-up instruction:
"To view and copy these icons, open the 'Search Bootstrap Icons' command and search for any of the recommended icon names. You can copy them in various formats (icon name, SVG, sprite, etc.)."`;

  console.log("[Bootstrap Icons Tool] Returning", result.length, "characters", "for", icons.length, "icons");

  return result;
}

import { CopyPaletteFormat, SavedPalette } from "../types";

/**
 * Creates CSS header comment block for palette information.
 */
function createCSSHeader(palette: SavedPalette): string {
  const lines = [
    `/* ${palette.name} - ${palette.mode} color palette */`,
    `/* Created: ${new Date(palette.createdAt).toLocaleDateString()} */`,
  ];

  if (palette.description) {
    lines.push(`/* Description: ${palette.description} */`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Generates JSON copy of palette data with complete metadata.
 */
export function copyAsJSON(palette: SavedPalette): string {
  const copyData = {
    name: palette.name,
    description: palette.description,
    mode: palette.mode,
    keywords: palette.keywords,
    colors: palette.colors,
    createdAt: palette.createdAt,
    copiedAt: new Date().toISOString(),
    copyFormat: "JSON",
  };

  return JSON.stringify(copyData, null, 2);
}

/**
 * Generates CSS color definitions using class selectors.
 */
export function copyAsCSS(palette: SavedPalette): string {
  const sanitizedName = palette.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const lines = [createCSSHeader(palette), ""];

  palette.colors.forEach((color, index) => {
    lines.push(
      `.${sanitizedName}-color-${index + 1} {`,
      `  color: ${color};`,
      "}",
      "",
      `.${sanitizedName}-bg-${index + 1} {`,
      `  background-color: ${color};`,
      "}",
      "",
    );
  });

  return lines.join("\n").trim();
}

/**
 * Generates CSS custom properties (variables) for modern CSS workflows.
 */
export function copyAsCSSVariables(palette: SavedPalette): string {
  const sanitizedName = palette.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const lines = [createCSSHeader(palette), ":root {"];

  palette.colors.forEach((color, index) => {
    lines.push(`  --${sanitizedName}-${index + 1}: ${color};`);
  });

  lines.push(
    "}",
    "",
    "/* Usage examples:",
    ` * color: var(--${sanitizedName}-1);`,
    ` * background-color: var(--${sanitizedName}-2);`,
    " */",
  );

  return lines.join("\n");
}

/**
 * Generates plain text export with palette information.
 */
export function copyAsText(palette: SavedPalette): string {
  const lines = [palette.name.toUpperCase(), "=".repeat(palette.name.length), ""];

  if (palette.description) {
    lines.push(`Description: ${palette.description}`);
  }

  lines.push(`Mode: ${palette.mode}`, `Created: ${new Date(palette.createdAt).toLocaleDateString()}`);

  if (palette.keywords.length > 0) {
    lines.push(`Keywords: ${palette.keywords.join(", ")}`);
  }

  lines.push("", `Colors (${palette.colors.length}):`, "-".repeat(15));

  palette.colors.forEach((color, index) => {
    lines.push(`${String(index + 1).padStart(2)}. ${color}`);
  });

  return lines.join("\n");
}

/**
 * Main copy function that handles all format types.
 */
export function copyPalette(palette: SavedPalette, format: CopyPaletteFormat): string {
  switch (format) {
    case "json":
      return copyAsJSON(palette);
    case "css":
      return copyAsCSS(palette);
    case "css-variables":
      return copyAsCSSVariables(palette);
    case "txt":
      return copyAsText(palette);
    default:
      throw new Error(`Unsupported copy format: ${format}`);
  }
}

/**
 * Gets the appropriate file extension for a format.
 */
export function getFileExtension(format: CopyPaletteFormat): string {
  switch (format) {
    case "json":
      return "json";
    case "css":
    case "css-variables":
      return "css";
    case "txt":
      return "txt";
    default:
      return "txt";
  }
}

/**
 * Gets a user-friendly display name for a format.
 */
export function getFormatDisplayName(format: CopyPaletteFormat): string {
  switch (format) {
    case "json":
      return "JSON";
    case "css":
      return "CSS Classes";
    case "css-variables":
      return "CSS Variables";
    case "txt":
      return "Plain Text";
    default:
      return format;
  }
}

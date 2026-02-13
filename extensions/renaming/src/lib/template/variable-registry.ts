/**
 * Template Variable Registry
 *
 * Single source of truth for all template variables.
 * Used by both the UI (template builder) and the parser (validation).
 */

export interface TemplateVariableDefinition {
  /** Variable name as used in templates (e.g., "original", "exif.dateTaken") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Example usage in a template pattern */
  example: string;
  /** Whether this variable requires file metadata */
  requiresMetadata: boolean;
  /** Whether this variable requires EXIF data */
  requiresExif: boolean;
  /** Whether this variable requires Spotlight metadata */
  requiresSpotlight: boolean;
}

/**
 * All available template variables
 */
export const TEMPLATE_VARIABLES: readonly TemplateVariableDefinition[] = [
  // Basic
  {
    name: "original",
    description: "Original filename (no extension)",
    example: "{original}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "extension",
    description: "File extension",
    example: "{extension}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "counter",
    description: "Sequential number (customize padding)",
    example: "{counter:001}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },

  // Date/Time
  {
    name: "date",
    description: "Date (customize format)",
    example: "{date:YYYY-MM-DD}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "time",
    description: "Time (customize format)",
    example: "{time:HH-mm-ss}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "year",
    description: "4-digit year",
    example: "{year}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "month",
    description: "Month (MM for zero-padded)",
    example: "{month:MM}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "day",
    description: "Day (DD for zero-padded)",
    example: "{day:DD}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },

  // Random
  {
    name: "random",
    description: "Random alphanumeric (customize length)",
    example: "{random:6}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "uuid",
    description: "UUID v4",
    example: "{uuid}",
    requiresMetadata: false,
    requiresExif: false,
    requiresSpotlight: false,
  },

  // File metadata
  {
    name: "file.size",
    description: "File size in bytes",
    example: "{file.size}",
    requiresMetadata: true,
    requiresExif: false,
    requiresSpotlight: false,
  },
  {
    name: "file.sizeFormatted",
    description: "Human readable size (1.5 MB)",
    example: "{file.sizeFormatted}",
    requiresMetadata: true,
    requiresExif: false,
    requiresSpotlight: false,
  },

  // EXIF metadata
  {
    name: "exif.dateTaken",
    description: "Photo date taken",
    example: "{exif.dateTaken:YYYY-MM-DD}",
    requiresMetadata: true,
    requiresExif: true,
    requiresSpotlight: false,
  },
  {
    name: "exif.dimensions",
    description: "Image dimensions (4032x3024)",
    example: "{exif.dimensions}",
    requiresMetadata: true,
    requiresExif: true,
    requiresSpotlight: false,
  },
  {
    name: "exif.camera",
    description: "Camera model",
    example: "{exif.camera}",
    requiresMetadata: true,
    requiresExif: true,
    requiresSpotlight: false,
  },

  // Spotlight metadata
  {
    name: "spotlight.artist",
    description: "Music artist",
    example: "{spotlight.artist}",
    requiresMetadata: true,
    requiresExif: false,
    requiresSpotlight: true,
  },
  {
    name: "spotlight.album",
    description: "Music album",
    example: "{spotlight.album}",
    requiresMetadata: true,
    requiresExif: false,
    requiresSpotlight: true,
  },
  {
    name: "spotlight.title",
    description: "Media title",
    example: "{spotlight.title}",
    requiresMetadata: true,
    requiresExif: false,
    requiresSpotlight: true,
  },
  {
    name: "spotlight.duration",
    description: "Media duration (seconds)",
    example: "{spotlight.duration}",
    requiresMetadata: true,
    requiresExif: false,
    requiresSpotlight: true,
  },
  {
    name: "spotlight.pageCount",
    description: "PDF page count",
    example: "{spotlight.pageCount}",
    requiresMetadata: true,
    requiresExif: false,
    requiresSpotlight: true,
  },
];

/**
 * Known variable prefixes (base names) derived from TEMPLATE_VARIABLES.
 * Used for validation in the template parser.
 */
export const KNOWN_VARIABLE_PREFIXES: readonly string[] = [
  ...new Set(TEMPLATE_VARIABLES.map((v) => v.name.split(".")[0]!)),
];

/**
 * Check if a variable name is known
 */
export function isKnownVariable(name: string): boolean {
  const base = name.split(".")[0]!;
  return KNOWN_VARIABLE_PREFIXES.includes(base);
}

/**
 * Get the description for a variable
 */
export function getVariableDescription(name: string): string | undefined {
  return TEMPLATE_VARIABLES.find((v) => v.name === name)?.description;
}

/**
 * Format the variable reference as markdown
 */
export function getVariableMarkdown(): string {
  return TEMPLATE_VARIABLES.map((v) => `- \`${v.example}\` - ${v.description}`).join("\n");
}

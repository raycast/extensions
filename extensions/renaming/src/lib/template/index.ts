/**
 * Template System
 *
 * Main exports and high-level functions for the template-based renaming system.
 */

import type {
  FileInfo,
  NamingTemplate,
  TemplateContext,
  TemplateToken,
  FileMetadataContext,
  RenameOperation,
} from "../../types";
import { dirname, join } from "path";
import { parseTemplate, validateTemplate, extractVariables } from "./parser";
import { resolveVariable } from "./variables";
import { transliterate, removeAccents, sanitizeFilename } from "./transliterate";
import { sortFiles, FileWithMetadata } from "./sorting";
import { transformCase } from "../case-transform";

// Re-export everything
export * from "./parser";
export * from "./variables";
export * from "./formatters";
export * from "./transliterate";
export * from "./sorting";
export * from "./defaults";

/**
 * Apply a template to generate a new filename
 *
 * @param template - The naming template configuration
 * @param file - File information
 * @param index - File index in the batch (for counter)
 * @param total - Total files in batch
 * @param metadata - Optional file metadata
 * @returns Generated filename (without extension)
 */
export function applyTemplate(
  template: NamingTemplate,
  file: FileInfo,
  index: number,
  total: number,
  metadata?: FileMetadataContext,
): string {
  // Parse the template pattern
  const parsed = parseTemplate(template.pattern);

  // Create context for variable resolution
  const context: TemplateContext = {
    file,
    index,
    total,
    metadata,
    dateSource: template.dateSource,
    counter: template.counter,
  };

  // Resolve all tokens to strings
  let result = resolveTokens(parsed.tokens, context);

  // Apply transliteration if enabled
  if (template.transliteration.enabled) {
    if (template.transliteration.removeAccents) {
      result = removeAccents(result);
    }
    result = transliterate(result, { removeUnmapped: false });
  }

  // Apply case transformation
  if (template.caseStyle !== "unchanged") {
    result = transformCase(result, template.caseStyle);
  }

  // Sanitize the result
  result = sanitizeFilename(result, {
    transliterate: false, // Already done above if needed
    removeAccents: false,
  });

  return result;
}

/**
 * Resolve all tokens in a parsed template to a string
 */
function resolveTokens(tokens: TemplateToken[], context: TemplateContext): string {
  return tokens
    .map((token) => {
      if (token.type === "literal") {
        return token.value;
      }
      return resolveVariable(token, context);
    })
    .join("");
}

/**
 * Process multiple files with a template
 *
 * @param template - The naming template
 * @param files - Files with optional metadata
 * @returns Array of rename operations
 */
export function processFilesWithTemplate(template: NamingTemplate, files: FileWithMetadata[]): RenameOperation[] {
  // Sort files according to template configuration
  const sortedFiles = sortFiles(files, template.sort);

  // Generate new names for each file, detecting same-directory collisions
  const seen = new Map<string, number>(); // "dir|newName" → count
  const operations: RenameOperation[] = sortedFiles.map((item, index) => {
    const newBaseName = applyTemplate(template, item.file, index, sortedFiles.length, item.metadata);

    let newName = item.file.extension ? `${newBaseName}${item.file.extension}` : newBaseName;
    const directory = dirname(item.file.path);

    // Deduplicate within same directory
    const key = `${directory}|${newName.toLowerCase()}`;
    const count = seen.get(key) ?? 0;
    if (count > 0) {
      const ext = item.file.extension || "";
      const base = ext ? newName.slice(0, -ext.length) : newName;
      newName = `${base}_${count}${ext}`;
    }
    seen.set(key, count + 1);

    return {
      oldPath: item.file.path,
      newName,
      newPath: join(directory, newName),
    };
  });

  return operations;
}

/**
 * Preview template results without executing
 *
 * @param template - The naming template
 * @param files - Files with optional metadata
 * @param limit - Maximum number of previews to generate
 * @returns Preview operations
 */
export function previewTemplate(
  template: NamingTemplate,
  files: FileWithMetadata[],
  limit: number = 5,
): RenameOperation[] {
  const operations = processFilesWithTemplate(template, files);
  return operations.slice(0, limit);
}

/**
 * Check what metadata is required for a template
 *
 * @param template - The naming template
 * @returns Object indicating what metadata is needed
 */
export function getTemplateRequirements(template: NamingTemplate): {
  needsMetadata: boolean;
  needsExif: boolean;
  needsSpotlight: boolean;
  needsFileStats: boolean;
} {
  const variables = extractVariables(template.pattern);

  const needsExif =
    variables.some((v) => v.startsWith("exif.")) ||
    template.dateSource === "exif" ||
    template.sort.field === "date_taken";

  const needsSpotlight = variables.some((v) => v.startsWith("spotlight."));

  const needsFileStats =
    variables.some((v) => v.startsWith("file.")) ||
    template.sort.field === "date_created" ||
    template.sort.field === "date_modified" ||
    template.sort.field === "size" ||
    template.dateSource === "created" ||
    template.dateSource === "modified";

  const needsMetadata = needsExif || needsSpotlight || needsFileStats;

  return {
    needsMetadata,
    needsExif,
    needsSpotlight,
    needsFileStats,
  };
}

/**
 * Validate a template and return any issues
 */
export function validateNamingTemplate(template: NamingTemplate): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate the pattern
  const patternValidation = validateTemplate(template.pattern);
  if (!patternValidation.valid && patternValidation.error) {
    errors.push(patternValidation.error);
  }
  if (patternValidation.warnings) {
    warnings.push(...patternValidation.warnings);
  }

  // Validate counter settings
  if (template.counter.padding < 1) {
    errors.push("Counter padding must be at least 1");
  }
  if (template.counter.step < 1) {
    errors.push("Counter step must be at least 1");
  }

  // Check for potential issues
  const variables = extractVariables(template.pattern);

  // Warn about EXIF date without EXIF sort
  if (variables.includes("exif.dateTaken") && template.sort.field !== "date_taken") {
    warnings.push("Using exif.dateTaken without sorting by date_taken may result in unexpected counter ordering");
  }

  // Warn about missing counter in multi-file scenarios
  if (!variables.includes("counter") && !variables.includes("original")) {
    warnings.push("Template has neither {counter} nor {original}, which may cause duplicate filenames");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a sample output for a template (for preview/testing)
 */
export function generateSampleOutput(template: NamingTemplate): string {
  const sampleFile: FileInfo = {
    path: "/Users/example/Photos/IMG_1234.jpg",
    name: "IMG_1234.jpg",
    baseName: "IMG_1234",
    extension: ".jpg",
    isDirectory: false,
  };

  const sampleMetadata: FileMetadataContext = {
    size: 2048000,
    created: new Date("2024-01-15T10:30:00"),
    modified: new Date("2024-01-15T14:45:00"),
    exif: {
      dateTaken: new Date("2024-01-15T09:15:00"),
      width: 4032,
      height: 3024,
      camera: "iPhone 15 Pro",
      cameraMake: "Apple",
      cameraModel: "iPhone 15 Pro",
    },
    spotlight: {
      duration: 0,
      pixelWidth: 4032,
      pixelHeight: 3024,
    },
  };

  const baseName = applyTemplate(template, sampleFile, 0, 1, sampleMetadata);
  return `${baseName}${sampleFile.extension}`;
}

/**
 * Default built-in templates
 *
 * These templates are available out of the box and cannot be deleted.
 */

import { CaseStyle, SortDirection, SortField, TemplateDateSource, type NamingTemplate } from "../../types";

/**
 * Photo Date Sequence
 *
 * Renames photos using their EXIF date taken and a sequential counter.
 * Great for organizing photos from a single event.
 *
 * Example: IMG_1234.jpg → 2024-01-15_001.jpg
 */
const photoDateSequence: NamingTemplate = {
  id: "builtin-photo-date-sequence",
  name: "Photo Date Sequence",
  description: "Rename photos by EXIF date with sequential numbers",
  pattern: "{exif.dateTaken:YYYY-MM-DD}_{counter:001}",
  dateSource: TemplateDateSource.EXIF,
  counter: { start: 1, step: 1, padding: 3 },
  sort: { field: SortField.DATE_TAKEN, direction: SortDirection.ASC },
  transliteration: { enabled: false, removeAccents: false },
  caseStyle: CaseStyle.UNCHANGED,
  isBuiltIn: true,
};

/**
 * Photo Date Original
 *
 * Keeps the original filename but prefixes with EXIF date.
 * Useful for maintaining recognizable names while adding date context.
 *
 * Example: vacation_sunset.jpg → 2024-01-15_vacation_sunset.jpg
 */
const photoDateOriginal: NamingTemplate = {
  id: "builtin-photo-date-original",
  name: "Photo Date Original",
  description: "Prefix photos with EXIF date, keep original name",
  pattern: "{exif.dateTaken:YYYY-MM-DD}_{original}",
  dateSource: TemplateDateSource.EXIF,
  counter: { start: 1, step: 1, padding: 3 },
  sort: { field: SortField.DATE_TAKEN, direction: SortDirection.ASC },
  transliteration: { enabled: false, removeAccents: false },
  caseStyle: CaseStyle.UNCHANGED,
  isBuiltIn: true,
};

/**
 * Video Organization
 *
 * Organizes videos by date and resolution.
 * Uses file modified date and Spotlight metadata for dimensions.
 *
 * Example: MVI_1234.mp4 → 2024-01-15_1920x1080_001.mp4
 */
const videoOrganization: NamingTemplate = {
  id: "builtin-video-organization",
  name: "Video Organization",
  description: "Organize videos by date and resolution",
  pattern: "{file.modified:YYYY-MM-DD}_{spotlight.pixelWidth}x{spotlight.pixelHeight}_{counter:001}",
  dateSource: TemplateDateSource.MODIFIED,
  counter: { start: 1, step: 1, padding: 3 },
  sort: { field: SortField.DATE_MODIFIED, direction: SortDirection.ASC },
  transliteration: { enabled: false, removeAccents: false },
  caseStyle: CaseStyle.UNCHANGED,
  isBuiltIn: true,
};

/**
 * Document Cleanup
 *
 * Cleans up document names with transliteration and snake_case,
 * appending the modified date.
 *
 * Example: Café Report (Final).pdf → cafe_report_final_2024-01-15.pdf
 */
const documentCleanup: NamingTemplate = {
  id: "builtin-document-cleanup",
  name: "Document Cleanup",
  description: "Clean up document names with date suffix",
  pattern: "{original}_{file.modified:YYYY-MM-DD}",
  dateSource: TemplateDateSource.MODIFIED,
  counter: { start: 1, step: 1, padding: 3 },
  sort: { field: SortField.NAME, direction: SortDirection.ASC },
  transliteration: { enabled: true, removeAccents: true },
  caseStyle: CaseStyle.SNAKE_CASE,
  isBuiltIn: true,
};

/**
 * Sequential Numbered
 *
 * Simple sequential numbering while preserving the original name.
 * Useful for ordering files that need to be processed in sequence.
 *
 * Example: report.pdf → report_0001.pdf
 */
const sequentialNumbered: NamingTemplate = {
  id: "builtin-sequential-numbered",
  name: "Sequential Numbered",
  description: "Add sequential numbers to filenames",
  pattern: "{original}_{counter:0001}",
  dateSource: TemplateDateSource.NOW,
  counter: { start: 1, step: 1, padding: 4 },
  sort: { field: SortField.NAME, direction: SortDirection.ASC },
  transliteration: { enabled: false, removeAccents: false },
  caseStyle: CaseStyle.UNCHANGED,
  isBuiltIn: true,
};

/**
 * Music Track Format
 *
 * Formats music files using Spotlight metadata.
 * Extracts artist, album, and title from audio metadata.
 *
 * Example: track01.mp3 → Artist_Name_Album_01_Song_Title.mp3
 */
const musicTrackFormat: NamingTemplate = {
  id: "builtin-music-track-format",
  name: "Music Track Format",
  description: "Format music files using metadata",
  pattern: "{spotlight.artist}_{spotlight.album}_{counter:00}_{spotlight.title}",
  dateSource: TemplateDateSource.NOW,
  counter: { start: 1, step: 1, padding: 2 },
  sort: { field: SortField.NAME, direction: SortDirection.ASC },
  transliteration: { enabled: true, removeAccents: true },
  caseStyle: CaseStyle.UNCHANGED,
  isBuiltIn: true,
};

/**
 * Timestamped Backup
 *
 * Adds a full timestamp to filenames for backup purposes.
 * Useful for creating versioned copies of files.
 *
 * Example: config.json → config_20240115_143052.json
 */
const timestampedBackup: NamingTemplate = {
  id: "builtin-timestamped-backup",
  name: "Timestamped Backup",
  description: "Add timestamp for backup/versioning",
  pattern: "{original}_{date:YYYYMMDD}_{time:HHmmss}",
  dateSource: TemplateDateSource.NOW,
  counter: { start: 1, step: 1, padding: 3 },
  sort: { field: SortField.NONE, direction: SortDirection.ASC },
  transliteration: { enabled: false, removeAccents: false },
  caseStyle: CaseStyle.UNCHANGED,
  isBuiltIn: true,
};

/**
 * All default templates
 */
export const DEFAULT_TEMPLATES: NamingTemplate[] = [
  photoDateSequence,
  photoDateOriginal,
  videoOrganization,
  documentCleanup,
  sequentialNumbered,
  musicTrackFormat,
  timestampedBackup,
];

/**
 * Get a default template by ID
 */
export function getDefaultTemplate(id: string): NamingTemplate | undefined {
  return DEFAULT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Check if a template ID is a built-in template
 */
export function isBuiltInTemplate(id: string): boolean {
  return id.startsWith("builtin-");
}

/**
 * Get default templates for a specific file category
 */
export function getTemplatesForCategory(category: string): NamingTemplate[] {
  switch (category) {
    case "image":
      return [photoDateSequence, photoDateOriginal];
    case "video":
      return [videoOrganization];
    case "audio":
      return [musicTrackFormat];
    case "document":
      return [documentCleanup, sequentialNumbered];
    default:
      return [sequentialNumbered, timestampedBackup];
  }
}

/**
 * Create a blank template with default values
 */
export function createBlankTemplate(id: string, name: string): NamingTemplate {
  return {
    id,
    name,
    description: "",
    pattern: "{original}_{counter:001}",
    dateSource: TemplateDateSource.NOW,
    counter: { start: 1, step: 1, padding: 3 },
    sort: { field: SortField.NAME, direction: SortDirection.ASC },
    transliteration: { enabled: false, removeAccents: false },
    caseStyle: CaseStyle.UNCHANGED,
    isBuiltIn: false,
  };
}

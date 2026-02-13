/**
 * Shared constants for the renaming extension
 *
 * Organized into grouped objects by domain.
 * Uses `as const` for type safety.
 */

import { SortField, CaseStyle, FileCategory } from "../types/enums";

// --- Display ---

export const DISPLAY_CONSTANTS = {
  PREVIEW_LIMIT: 5,
  MAX_SUGGESTED_NAME_LENGTH: 50,
} as const;

// --- File System ---

export const FILE_CONSTANTS = {
  MAX_FILENAME_LENGTH: 255,
  MAX_UNIQUE_FILENAME_ATTEMPTS: 1000,
  THUMBNAIL_CACHE_DIR: "raycast-renaming-thumbnails",
  THUMBNAIL_SIZE: 512,
  THUMBNAIL_TIMEOUT: 10000,
} as const;

// --- Batch Operations ---

export const BATCH_CONSTANTS = {
  BATCH_PROGRESS_THRESHOLD: 10,
  MAX_HISTORY_ENTRIES: 10,
} as const;

// --- Storage ---

export const STORAGE_KEYS = {
  HISTORY: "renaming-history",
  PRESETS: "renaming-presets",
} as const;

// --- Formatting ---

export const FORMAT_CONSTANTS = {
  SIZE_UNITS: ["B", "KB", "MB", "GB", "TB"],
  RANDOM_CHARS: "abcdefghijklmnopqrstuvwxyz0123456789",
  DEFAULT_DATE_FORMAT: "YYYY-MM-DD",
  DEFAULT_TIME_FORMAT: "HH-mm-ss",
  DEFAULT_RANDOM_LENGTH: 6,
  DEFAULT_COUNTER_PADDING: 3,
} as const;

// --- Label Records ---

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  [SortField.NONE]: "Original Order",
  [SortField.NAME]: "Name",
  [SortField.DATE_CREATED]: "Date Created",
  [SortField.DATE_MODIFIED]: "Date Modified",
  [SortField.DATE_TAKEN]: "Date Taken (EXIF)",
  [SortField.SIZE]: "File Size",
};

export const CASE_STYLE_LABELS: Record<CaseStyle, string> = {
  [CaseStyle.UNCHANGED]: "Unchanged",
  [CaseStyle.UPPERCASE]: "UPPERCASE",
  [CaseStyle.LOWERCASE]: "lowercase",
  [CaseStyle.TITLE_CASE]: "Title Case",
  [CaseStyle.SENTENCE_CASE]: "Sentence case",
  [CaseStyle.CAMEL_CASE]: "camelCase",
  [CaseStyle.PASCAL_CASE]: "PascalCase",
  [CaseStyle.SNAKE_CASE]: "snake_case",
  [CaseStyle.KEBAB_CASE]: "kebab-case",
};

export const CATEGORY_SORT_RECOMMENDATIONS: Partial<Record<FileCategory, SortField>> = {
  [FileCategory.IMAGE]: SortField.DATE_TAKEN,
  [FileCategory.VIDEO]: SortField.DATE_MODIFIED,
  [FileCategory.AUDIO]: SortField.DATE_MODIFIED,
  [FileCategory.DOCUMENT]: SortField.NAME,
};

export const CATEGORY_SORT_DEFAULT = SortField.NAME;

// --- Date Sources ---

export const DATE_SOURCE_LABELS: Record<import("../types/enums").TemplateDateSource, string> = {
  now: "Current Date/Time",
  created: "File Created Date",
  modified: "File Modified Date",
  exif: "Photo Date Taken (EXIF)",
};

// --- Backward-compatible flat exports ---

export const PREVIEW_LIMIT = DISPLAY_CONSTANTS.PREVIEW_LIMIT;
export const BATCH_PROGRESS_THRESHOLD = BATCH_CONSTANTS.BATCH_PROGRESS_THRESHOLD;
export const MAX_HISTORY_ENTRIES = BATCH_CONSTANTS.MAX_HISTORY_ENTRIES;
export const MAX_FILENAME_LENGTH = FILE_CONSTANTS.MAX_FILENAME_LENGTH;
export const MAX_UNIQUE_FILENAME_ATTEMPTS = FILE_CONSTANTS.MAX_UNIQUE_FILENAME_ATTEMPTS;

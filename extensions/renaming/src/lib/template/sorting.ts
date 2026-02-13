/**
 * File sorting for smart numbering
 *
 * Sorts files before applying templates so that counter variables
 * follow a logical order (e.g., photos sorted by date taken).
 */

import type { FileInfo, FileMetadataContext } from "../../types";
import { SortField, SortDirection } from "../../types/enums";
import { SORT_FIELD_LABELS, CATEGORY_SORT_RECOMMENDATIONS, CATEGORY_SORT_DEFAULT } from "../constants";

export interface FileWithMetadata {
  file: FileInfo;
  metadata?: FileMetadataContext;
}

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Sort files according to the specified configuration
 *
 * @param files - Array of files with optional metadata
 * @param config - Sort configuration (field and direction)
 * @returns Sorted array (new array, original not modified)
 */
export function sortFiles(files: FileWithMetadata[], config: SortConfig): FileWithMetadata[] {
  const { field, direction } = config;

  // No sorting needed
  if (field === SortField.NONE) {
    return [...files];
  }

  const sorted = [...files].sort((a, b) => {
    const comparison = compareFiles(a, b, field);
    return direction === SortDirection.ASC ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Compare two files based on a sort field
 */
function compareFiles(a: FileWithMetadata, b: FileWithMetadata, field: SortField): number {
  switch (field) {
    case SortField.NAME:
      return compareName(a.file, b.file);

    case SortField.DATE_CREATED:
      return compareDate(a.metadata?.created, b.metadata?.created);

    case SortField.DATE_MODIFIED:
      return compareDate(a.metadata?.modified, b.metadata?.modified);

    case SortField.DATE_TAKEN:
      return compareDateTaken(a.metadata, b.metadata);

    case SortField.SIZE:
      return compareSize(a.metadata?.size, b.metadata?.size);

    case SortField.NONE:
    default:
      return 0;
  }
}

/**
 * Compare files by name (natural sort)
 */
function compareName(a: FileInfo, b: FileInfo): number {
  return naturalCompare(a.name, b.name);
}

/**
 * Compare two dates, handling undefined values
 */
function compareDate(a: Date | undefined, b: Date | undefined): number {
  // Undefined dates sort to the end
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  return a.getTime() - b.getTime();
}

/**
 * Compare by date taken (EXIF), falling back to modified date
 */
function compareDateTaken(a: FileMetadataContext | undefined, b: FileMetadataContext | undefined): number {
  const dateA = a?.exif?.dateTaken || a?.modified;
  const dateB = b?.exif?.dateTaken || b?.modified;

  return compareDate(dateA, dateB);
}

/**
 * Compare files by size
 */
function compareSize(a: number | undefined, b: number | undefined): number {
  // Undefined sizes sort to the end
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;

  return a - b;
}

/**
 * Natural comparison for strings (handles numbers properly)
 *
 * "file2" comes before "file10" unlike standard string comparison
 */
function naturalCompare(a: string, b: string): number {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return collator.compare(a, b);
}

/**
 * Get a human-readable label for a sort field
 */
export function getSortFieldLabel(field: SortField): string {
  return SORT_FIELD_LABELS[field];
}

/**
 * Get all available sort fields
 */
export function getSortFields(): Array<{ value: SortField; label: string }> {
  return Object.values(SortField).map((field) => ({
    value: field,
    label: getSortFieldLabel(field),
  }));
}

/**
 * Check if a sort field requires metadata
 */
export function sortRequiresMetadata(field: SortField): boolean {
  return field !== SortField.NONE && field !== SortField.NAME;
}

/**
 * Check if a sort field requires EXIF data
 */
export function sortRequiresExif(field: SortField): boolean {
  return field === SortField.DATE_TAKEN;
}

/**
 * Get the recommended sort field for a file category
 */
export function getRecommendedSort(fileCategory: string): SortField {
  return (
    CATEGORY_SORT_RECOMMENDATIONS[fileCategory as keyof typeof CATEGORY_SORT_RECOMMENDATIONS] ?? CATEGORY_SORT_DEFAULT
  );
}

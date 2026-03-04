// ============================================================================
// Everything SDK – Enums, constants & utility functions
// ============================================================================

/** Error codes returned by Everything_GetLastError */
export enum ErrorCode {
  OK = 0,
  MEMORY = 1,
  IPC = 2,
  REGISTERCLASSEX = 3,
  CREATEWINDOW = 4,
  CREATETHREAD = 5,
  INVALIDINDEX = 6,
  INVALIDCALL = 7,
  INVALIDREQUEST = 8,
  INVALIDPARAMETER = 9,
}

/** Request flags specifying what information to retrieve for each result */
export enum RequestFlags {
  FILE_NAME = 0x00000001,
  PATH = 0x00000002,
  FULL_PATH_AND_FILE_NAME = 0x00000004,
  EXTENSION = 0x00000008,
  SIZE = 0x00000010,
  DATE_CREATED = 0x00000020,
  DATE_MODIFIED = 0x00000040,
  DATE_ACCESSED = 0x00000080,
  ATTRIBUTES = 0x00000100,
  FILE_LIST_FILE_NAME = 0x00000200,
  RUN_COUNT = 0x00000400,
  DATE_RUN = 0x00000800,
  DATE_RECENTLY_CHANGED = 0x00001000,
  HIGHLIGHTED_FILE_NAME = 0x00002000,
  HIGHLIGHTED_PATH = 0x00004000,
  HIGHLIGHTED_FULL_PATH_AND_FILE_NAME = 0x00008000,
}

/** Sort types defining available sort orders */
export enum SortType {
  NAME_ASCENDING = 1,
  NAME_DESCENDING = 2,
  PATH_ASCENDING = 3,
  PATH_DESCENDING = 4,
  SIZE_ASCENDING = 5,
  SIZE_DESCENDING = 6,
  EXTENSION_ASCENDING = 7,
  EXTENSION_DESCENDING = 8,
  TYPE_NAME_ASCENDING = 9,
  TYPE_NAME_DESCENDING = 10,
  DATE_CREATED_ASCENDING = 11,
  DATE_CREATED_DESCENDING = 12,
  DATE_MODIFIED_ASCENDING = 13,
  DATE_MODIFIED_DESCENDING = 14,
  ATTRIBUTES_ASCENDING = 15,
  ATTRIBUTES_DESCENDING = 16,
  FILE_LIST_FILENAME_ASCENDING = 17,
  FILE_LIST_FILENAME_DESCENDING = 18,
  RUN_COUNT_ASCENDING = 19,
  RUN_COUNT_DESCENDING = 20,
  DATE_RECENTLY_CHANGED_ASCENDING = 21,
  DATE_RECENTLY_CHANGED_DESCENDING = 22,
  DATE_ACCESSED_ASCENDING = 23,
  DATE_ACCESSED_DESCENDING = 24,
  DATE_RUN_ASCENDING = 25,
  DATE_RUN_DESCENDING = 26,
}

/** Target machine identifiers */
export enum TargetMachine {
  X86 = 1,
  X64 = 2,
  ARM = 3,
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a Win32 FILETIME to a JS Date.
 * FILETIME = 100-ns intervals since 1601-01-01.
 */
export function filetimeToDate(ft: { dwLowDateTime: number; dwHighDateTime: number }): Date {
  const val = BigInt(ft.dwHighDateTime) * 0x100000000n + BigInt(ft.dwLowDateTime);
  const EPOCH_DIFF = 116444736000000000n;
  return new Date(Number((val - EPOCH_DIFF) / 10000n));
}

/**
 * Convert a LARGE_INTEGER struct to a JS number.
 */
export function largeIntToNumber(li: { LowPart: number; HighPart: number }): number {
  if (li.HighPart === 0) return li.LowPart;
  const val = BigInt(li.HighPart) * 0x100000000n + BigInt(li.LowPart >>> 0);
  return Number(val);
}

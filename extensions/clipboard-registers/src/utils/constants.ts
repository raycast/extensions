/**
 * Application constants for the Clipboard Registers extension
 */

/** Valid register IDs */
export const REGISTER_IDS = [1, 2, 3, 4] as const;

/** Configuration constants */
export const CONFIG = {
  /** Maximum length for text preview in characters */
  TEXT_PREVIEW_LENGTH: 1000,

  /** Maximum file size for clipboard content (50MB) */
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  /** Directory name for storing clipboard content files */
  CONTENT_DIR: "clipboard-registers",

  /** Local storage key for clipboard state */
  STORAGE_KEY: "clipboard-registers-state",
} as const;

/** Content type constants */
export const CONTENT_TYPES = {
  TEXT: "text",
  FILE: "file",
  HTML: "html",
} as const;

/** Default register state */
export const DEFAULT_STATE = {
  activeRegister: 1,
  initialized: false,
  registers: { 1: null, 2: null, 3: null, 4: null },
} as const;

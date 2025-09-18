/**
 * Application-wide constants and configuration values
 * Organized by domain for better maintainability
 */

// ============================================================================
// BUSINESS DOMAIN CONSTANTS
// ============================================================================

/**
 * Built-in template identifiers
 * These serve as the single source of truth for template IDs
 */
export const TEMPLATE_TYPES = {
  SLACK: "slack",
  CODE_REVIEW: "code-review",
  EMAIL: "email",
  BUG_REPORT: "bug-report",
  TECHNICAL_DOCS: "technical-docs",
  CUSTOM: "custom",
} as const;

/**
 * Built-in tone identifiers
 * These serve as the single source of truth for tone IDs
 */
export const TONE_TYPES = {
  DEFAULT: "default",
  PROFESSIONAL: "professional",
  CONVERSATIONAL: "conversational",
  TECHNICAL: "technical",
  EDUCATIONAL: "educational",
  CONCISE: "concise",
} as const;

/**
 * Entity type labels for UI display
 */
export const ENTITY_TYPES = {
  TEMPLATE: "Template",
  TONE: "Tone",
} as const;

// ============================================================================
// SYSTEM & PROCESSING CONSTANTS
// ============================================================================

/**
 * Timeout configurations in milliseconds
 * All timeout values use consistent number types
 */
export const TIMEOUTS = {
  /** Maximum allowed timeout (5 minutes) */
  MAX_MS: 300_000,
  /** Default operation timeout (2 minutes) */
  DEFAULT_MS: 120_000,
  /** Default timeout as string (for compatibility) */
  DEFAULT_STRING: "120000",
} as const;

/**
 * Input processing limits
 */
export const INPUT_LIMITS = {
  /** Maximum input text length */
  MAX_TEXT_LENGTH: 200_000,
} as const;

/**
 * Authentication and recovery commands
 */
export const AUTH_COMMANDS = {
  CHECK_API_KEY: "check_api_key",
  VERIFY_TOKEN: "verify_token",
} as const;

/**
 * File system permission constants
 */
export const FILE_PERMISSIONS = {
  EXECUTE_OWNER: 0o100,
  EXECUTE_GROUP: 0o010,
  EXECUTE_OTHER: 0o001,
} as const;

/**
 * Entity management configuration
 */
export const MANAGEMENT_CONFIG = {
  MANAGE_PREFIX: "MANAGE_",
} as const;

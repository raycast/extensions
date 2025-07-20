import { REGISTER_IDS, CONTENT_TYPES } from "./constants";

/** Valid register ID type derived from constants */
export type RegisterId = (typeof REGISTER_IDS)[number];

/** Content type derived from constants */
export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];

/** Type-safe register map */
export type RegisterMap = Record<RegisterId, RegisterMetadata | null>;

/**
 * Metadata for a clipboard register
 */
export interface RegisterMetadata {
  /** The register ID this metadata belongs to */
  registerId: RegisterId;
  /** Type of content stored in this register */
  contentType: ContentType;
  /** UUID-based filename in supportPath */
  fileName: string;
  /** Timestamp when content was saved */
  timestamp: number;
  /** Original filename for display purposes */
  originalFileName?: string;
  /** Array of file paths for file content */
  filePaths?: string[];
  /** Text preview for user display/debugging/logging */
  textPreview?: string;
}

/**
 * Application state for clipboard registers
 */
export interface ClipboardState {
  /** Currently active register */
  activeRegister: RegisterId;
  /** Whether the application has been initialized */
  initialized: boolean;
  /** Map of register IDs to their metadata */
  registers: RegisterMap;
}

/**
 * Union type for different clipboard content types
 */
export type ClipboardContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "file";
      filePaths: string[];
    }
  | {
      type: "html";
      html: string;
      text?: string;
    };

/**
 * Display data for the overview component
 */
export interface RegisterDisplayData {
  activeRegister: RegisterId;
  registers: Array<{
    id: RegisterId;
    metadata: RegisterMetadata | null;
    isActive: boolean;
  }>;
}

// Type Guards

/**
 * Type guard to check if a value is a valid register ID
 */
export function isValidRegisterId(value: unknown): value is RegisterId {
  return typeof value === "number" && REGISTER_IDS.includes(value as RegisterId);
}

/**
 * Type guard to check if a value is a valid content type
 */
export function isValidContentType(value: unknown): value is ContentType {
  return typeof value === "string" && Object.values(CONTENT_TYPES).includes(value as ContentType);
}

/**
 * Type guard to check if an object is valid RegisterMetadata
 */
export function isValidRegisterMetadata(value: unknown): value is RegisterMetadata {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;

  return (
    isValidRegisterId(obj.registerId) &&
    isValidContentType(obj.contentType) &&
    typeof obj.fileName === "string" &&
    typeof obj.timestamp === "number" &&
    (obj.originalFileName === undefined || typeof obj.originalFileName === "string") &&
    (obj.filePaths === undefined || Array.isArray(obj.filePaths)) &&
    (obj.textPreview === undefined || typeof obj.textPreview === "string")
  );
}

/**
 * Type guard to check if an object is valid ClipboardState
 */
export function isValidClipboardState(value: unknown): value is ClipboardState {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;

  return (
    isValidRegisterId(obj.activeRegister) &&
    typeof obj.initialized === "boolean" &&
    typeof obj.registers === "object" &&
    obj.registers !== null
  );
}

// Utility Types

/**
 * Utility type for register operations
 */
export type RegisterOperation = "switch" | "copy" | "clear";

/**
 * Utility type for file operation results
 */
export type FileOperationResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

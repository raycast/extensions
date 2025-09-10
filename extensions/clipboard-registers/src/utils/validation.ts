import { normalize, resolve } from "path";
import { RegisterId, ContentType, ClipboardState, RegisterMetadata } from "./types";
import { REGISTER_IDS, CONFIG, CONTENT_TYPES } from "./constants";
import { ValidationError, FileOperationError } from "./errors";

/**
 * Validates and sanitizes a register ID
 */
export function validateRegisterId(value: unknown): RegisterId {
  if (!isValidRegisterId(value)) {
    throw new ValidationError(
      `Invalid register ID: ${value}. Must be one of: ${REGISTER_IDS.join(", ")}`,
      "registerId",
      value,
    );
  }
  return value;
}

/**
 * Type guard for register ID validation
 */
function isValidRegisterId(value: unknown): value is RegisterId {
  return typeof value === "number" && REGISTER_IDS.includes(value as RegisterId);
}

/**
 * Validates content type
 */
export function validateContentType(value: unknown): ContentType {
  if (!isValidContentType(value)) {
    throw new ValidationError(
      `Invalid content type: ${value}. Must be one of: ${Object.values(CONTENT_TYPES).join(", ")}`,
      "contentType",
      value,
    );
  }
  return value;
}

/**
 * Type guard for content type validation
 */
function isValidContentType(value: unknown): value is ContentType {
  return typeof value === "string" && Object.values(CONTENT_TYPES).includes(value as ContentType);
}

/**
 * Sanitizes and validates file paths
 */
export function sanitizeFilePath(filePath: string, basePath: string): string {
  if (!filePath) {
    throw new ValidationError("File path must be a non-empty string", "filePath", filePath);
  }

  // Normalize and resolve the path to prevent directory traversal
  const normalizedPath = normalize(filePath);
  const resolvedPath = resolve(basePath, normalizedPath);

  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(resolve(basePath))) {
    throw new FileOperationError(`File path outside allowed directory: ${filePath}`, filePath);
  }

  return resolvedPath;
}

/**
 * Validates text content size
 */
export function validateTextContent(text: string): string {
  const sizeInBytes = Buffer.byteLength(text, "utf8");
  if (sizeInBytes > CONFIG.MAX_FILE_SIZE) {
    throw new ValidationError(
      `Text content too large: ${sizeInBytes} bytes (max: ${CONFIG.MAX_FILE_SIZE})`,
      "text",
      "[Text is too long to display]",
    );
  }

  return text;
}

/**
 * Validates file paths array
 */
export function validateFilePaths(filePaths: unknown): string[] {
  if (!Array.isArray(filePaths)) {
    throw new ValidationError("File paths must be an array", "filePaths", filePaths);
  }

  if (filePaths.length === 0) {
    throw new ValidationError("File paths array cannot be empty", "filePaths", filePaths);
  }

  return filePaths.map((path, index) => {
    if (typeof path !== "string") {
      throw new ValidationError(`File path at index ${index} must be a string`, "filePaths", path);
    }
    return path;
  });
}

/**
 * Validates HTML content
 */
export function validateHtmlContent(html: string, text?: string): { html: string; text?: string } {
  const htmlSizeInBytes = Buffer.byteLength(html, "utf8");
  const textSizeInBytes = text ? Buffer.byteLength(text, "utf8") : 0;
  const totalSize = htmlSizeInBytes + textSizeInBytes;

  if (totalSize > CONFIG.MAX_FILE_SIZE) {
    throw new ValidationError(
      `HTML content too large: ${totalSize} bytes (max: ${CONFIG.MAX_FILE_SIZE})`,
      "html",
      html,
    );
  }

  return { html, text };
}

/**
 * Validates clipboard state structure
 */
export function validateClipboardState(state: unknown): ClipboardState {
  if (!state || typeof state !== "object") {
    throw new ValidationError("Clipboard state must be an object", "state", state);
  }

  const obj = state as Record<string, unknown>;

  // Validate activeRegister
  const activeRegister = validateRegisterId(obj.activeRegister);

  // Validate initialized
  if (typeof obj.initialized !== "boolean") {
    throw new ValidationError("initialized must be a boolean", "initialized", obj.initialized);
  }

  // Validate registers
  if (!obj.registers || typeof obj.registers !== "object") {
    throw new ValidationError("registers must be an object", "registers", obj.registers);
  }

  const registers = obj.registers as Record<string, unknown>;
  const validatedRegisters: Record<RegisterId, RegisterMetadata | null> = {
    1: null,
    2: null,
    3: null,
    4: null,
  };

  for (const registerId of REGISTER_IDS) {
    const registerData = registers[registerId.toString()];
    if (registerData === null || registerData === undefined) {
      validatedRegisters[registerId] = null;
    } else if (isValidRegisterMetadata(registerData)) {
      validatedRegisters[registerId] = registerData;
    } else {
      throw new ValidationError(`Invalid register metadata for register ${registerId}`, "registers", registerData);
    }
  }

  return {
    activeRegister,
    initialized: obj.initialized,
    registers: validatedRegisters,
  };
}

/**
 * Type guard for register metadata
 */
function isValidRegisterMetadata(value: unknown): value is RegisterMetadata {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;

  try {
    validateRegisterId(obj.registerId);
    validateContentType(obj.contentType);

    return (
      typeof obj.fileName === "string" &&
      typeof obj.timestamp === "number" &&
      (obj.originalFileName === undefined || typeof obj.originalFileName === "string") &&
      (obj.filePaths === undefined || Array.isArray(obj.filePaths)) &&
      (obj.textPreview === undefined || typeof obj.textPreview === "string")
    );
  } catch {
    return false;
  }
}

/**
 * Creates a truncated text preview
 */
export function createTextPreview(text: string): string {
  if (text.length <= CONFIG.TEXT_PREVIEW_LENGTH) {
    return text;
  }
  return text.substring(0, CONFIG.TEXT_PREVIEW_LENGTH) + "...";
}

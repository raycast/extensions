import { existsSync } from "fs";
import { SSHHostConfig } from "../types/server";

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a local path exists on the filesystem
 * @param path - The local file or directory path to validate
 * @returns Validation result with error message if invalid
 */
export function validateLocalPath(path: string): ValidationResult {
  if (!path || path.trim() === "") {
    return { valid: false, error: "Local path cannot be empty" };
  }

  if (!existsSync(path)) {
    return { valid: false, error: "File not found" };
  }

  return { valid: true };
}

/**
 * Validates remote path format
 * @param path - The remote path to validate
 * @returns Validation result with error message if invalid
 */
export function validateRemotePath(path: string): ValidationResult {
  if (!path || path.trim() === "") {
    return { valid: false, error: "Remote path cannot be empty" };
  }

  // Check for invalid characters that could cause issues
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[\x00-\x1F\x7F]/;
  if (invalidChars.test(path)) {
    return {
      valid: false,
      error: "Invalid path format: contains control characters",
    };
  }

  return { valid: true };
}

/**
 * Validates that a port number is within valid range (1-65535)
 * @param port - The port number to validate
 * @returns Validation result with error message if invalid
 */
export function validatePort(port: number): ValidationResult {
  if (!Number.isInteger(port)) {
    return { valid: false, error: "Port must be an integer" };
  }

  if (port < 1 || port > 65535) {
    return {
      valid: false,
      error: "Invalid port number: must be between 1 and 65535",
    };
  }

  return { valid: true };
}

/**
 * Validates that a host configuration has required fields and valid values
 * @param config - The SSH host configuration to validate
 * @returns Validation result with error message if invalid
 */
export function validateHostConfig(config: SSHHostConfig): ValidationResult {
  if (!config) {
    return { valid: false, error: "Host configuration is required" };
  }

  if (!config.host || config.host.trim() === "") {
    return { valid: false, error: "Host alias is required" };
  }

  // Validate port if present
  if (config.port !== undefined) {
    const portValidation = validatePort(config.port);
    if (!portValidation.valid) {
      return portValidation;
    }
  }

  return { valid: true };
}

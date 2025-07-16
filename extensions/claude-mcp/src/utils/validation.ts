/**
 * Validation system for MCP profiles and configurations
 * Ensures data integrity and prevents invalid configurations
 */

import { promises as fs } from "fs";
import { isAbsolute } from "path";
import { MCPProfile, MCPServersConfig, MCPServerConfig, ValidationResult } from "../types";

// Validation severity levels
export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

// Enhanced validation result with severity
export interface DetailedValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
}

export interface ValidationIssue {
  severity: ValidationSeverity;
  field?: string;
  message: string;
  code: string;
  value?: unknown;
}

// Validation configuration
const VALIDATION_CONFIG = {
  MAX_PROFILE_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_SERVER_NAME_LENGTH: 50,
  MAX_COMMAND_LENGTH: 500,
  MAX_ARG_LENGTH: 200,
  MAX_ENV_KEY_LENGTH: 100,
  MAX_ENV_VALUE_LENGTH: 1000,
  MAX_ARGS_COUNT: 50,
  MAX_ENV_VARS_COUNT: 100,
  ALLOWED_COMMAND_PREFIXES: [
    "/usr/local/bin/",
    "/usr/bin/",
    "/bin/",
    "/opt/",
    "node",
    "python",
    "python3",
    "npx",
    "npm",
    "pnpm",
    "yarn",
    "deno",
    "bun",
  ],
  DANGEROUS_COMMANDS: [
    "rm",
    "rmdir",
    "sudo",
    "su",
    "chmod",
    "chown",
    "dd",
    "mkfs",
    "fdisk",
    "format",
    "del",
    "deltree",
  ],
  RESERVED_ENV_VARS: ["PATH", "HOME", "USER", "SHELL", "PWD", "OLDPWD"],
} as const;

/**
 * Create validation issue
 */
function createIssue(
  severity: ValidationSeverity,
  code: string,
  message: string,
  field?: string,
  value?: unknown,
): ValidationIssue {
  return { severity, code, message, field, value };
}

/**
 * Check if a string is a valid identifier (alphanumeric, underscore, hyphen)
 */
function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(str);
}

/**
 * Check if command path is safe and allowed
 */
function isCommandSafe(command: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for dangerous commands
  const commandBase = command.split(/[\s/]/).pop()?.toLowerCase() || "";
  if (
    VALIDATION_CONFIG.DANGEROUS_COMMANDS.includes(commandBase as (typeof VALIDATION_CONFIG.DANGEROUS_COMMANDS)[number])
  ) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "DANGEROUS_COMMAND",
        `Command "${commandBase}" is not allowed for security reasons`,
        "command",
        command,
      ),
    );
  }

  // Check for suspicious patterns
  if (command.includes("..") || command.includes("//")) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "SUSPICIOUS_PATH",
        "Command path contains suspicious patterns (.. or //)",
        "command",
        command,
      ),
    );
  }

  // Check for shell injection patterns
  const dangerousChars = /[;&|`$(){}[\]<>]/;
  if (dangerousChars.test(command)) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "SHELL_INJECTION_RISK",
        "Command contains potentially dangerous characters",
        "command",
        command,
      ),
    );
  }

  // Check if command is in allowed prefixes (warning for absolute paths)
  if (isAbsolute(command)) {
    const isAllowed = VALIDATION_CONFIG.ALLOWED_COMMAND_PREFIXES.some((prefix) => command.startsWith(prefix));

    if (!isAllowed) {
      issues.push(
        createIssue(
          ValidationSeverity.WARNING,
          "UNRECOGNIZED_PATH",
          `Command path "${command}" is not in recognized system locations`,
          "command",
          command,
        ),
      );
    }
  }

  return issues;
}

/**
 * Check if command executable exists (for absolute paths)
 */
async function checkCommandExists(command: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  if (!isAbsolute(command)) {
    return issues; // Skip check for relative commands (node, npm, etc.)
  }

  try {
    const stats = await fs.stat(command);

    if (!stats.isFile()) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "COMMAND_NOT_FILE",
          `Command path "${command}" exists but is not a file`,
          "command",
          command,
        ),
      );
    } else {
      // Check if file is executable (on Unix-like systems)
      try {
        await fs.access(command, fs.constants.X_OK);
      } catch {
        issues.push(
          createIssue(
            ValidationSeverity.WARNING,
            "COMMAND_NOT_EXECUTABLE",
            `Command "${command}" may not be executable`,
            "command",
            command,
          ),
        );
      }
    }
  } catch {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "COMMAND_NOT_FOUND",
        `Command "${command}" does not exist`,
        "command",
        command,
      ),
    );
  }

  return issues;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(env: Record<string, string> | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!env) return issues;

  if (typeof env !== "object" || Array.isArray(env)) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "INVALID_ENV_TYPE",
        "Environment variables must be a plain object",
        "env",
        env,
      ),
    );
    return issues;
  }

  const envKeys = Object.keys(env);

  if (envKeys.length > VALIDATION_CONFIG.MAX_ENV_VARS_COUNT) {
    issues.push(
      createIssue(
        ValidationSeverity.WARNING,
        "TOO_MANY_ENV_VARS",
        `Too many environment variables (${envKeys.length}), maximum recommended is ${VALIDATION_CONFIG.MAX_ENV_VARS_COUNT}`,
        "env",
      ),
    );
  }

  for (const [key, value] of Object.entries(env)) {
    // Validate key
    if (!key || typeof key !== "string") {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "INVALID_ENV_KEY",
          "Environment variable key must be a non-empty string",
          `env.${key}`,
          key,
        ),
      );
      continue;
    }

    if (key.length > VALIDATION_CONFIG.MAX_ENV_KEY_LENGTH) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "ENV_KEY_TOO_LONG",
          `Environment variable key "${key}" is too long (max ${VALIDATION_CONFIG.MAX_ENV_KEY_LENGTH} characters)`,
          `env.${key}`,
          key,
        ),
      );
    }

    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      issues.push(
        createIssue(
          ValidationSeverity.WARNING,
          "INVALID_ENV_KEY_FORMAT",
          `Environment variable key "${key}" should follow convention (uppercase, underscores only)`,
          `env.${key}`,
          key,
        ),
      );
    }

    if (VALIDATION_CONFIG.RESERVED_ENV_VARS.includes(key as (typeof VALIDATION_CONFIG.RESERVED_ENV_VARS)[number])) {
      issues.push(
        createIssue(
          ValidationSeverity.WARNING,
          "RESERVED_ENV_VAR",
          `Environment variable "${key}" is a reserved system variable`,
          `env.${key}`,
          key,
        ),
      );
    }

    // Validate value
    if (typeof value !== "string") {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "INVALID_ENV_VALUE_TYPE",
          `Environment variable "${key}" value must be a string`,
          `env.${key}`,
          value,
        ),
      );
      continue;
    }

    if (value.length > VALIDATION_CONFIG.MAX_ENV_VALUE_LENGTH) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "ENV_VALUE_TOO_LONG",
          `Environment variable "${key}" value is too long (max ${VALIDATION_CONFIG.MAX_ENV_VALUE_LENGTH} characters)`,
          `env.${key}`,
          value,
        ),
      );
    }

    // Check for suspicious values
    if (value.includes("..") || /[;&|`$(){}[\]<>]/.test(value)) {
      issues.push(
        createIssue(
          ValidationSeverity.WARNING,
          "SUSPICIOUS_ENV_VALUE",
          `Environment variable "${key}" contains potentially dangerous characters`,
          `env.${key}`,
          value,
        ),
      );
    }
  }

  return issues;
}

/**
 * Validate MCP server configuration
 */
export async function validateMCPServer(
  serverName: string,
  config: MCPServerConfig,
): Promise<DetailedValidationResult> {
  const issues: ValidationIssue[] = [];

  // Validate server name
  if (!serverName || typeof serverName !== "string") {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "INVALID_SERVER_NAME",
        "Server name must be a non-empty string",
        "serverName",
        serverName,
      ),
    );
  } else {
    if (serverName.length > VALIDATION_CONFIG.MAX_SERVER_NAME_LENGTH) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "SERVER_NAME_TOO_LONG",
          `Server name "${serverName}" is too long (max ${VALIDATION_CONFIG.MAX_SERVER_NAME_LENGTH} characters)`,
          "serverName",
          serverName,
        ),
      );
    }

    if (!isValidIdentifier(serverName)) {
      issues.push(
        createIssue(
          ValidationSeverity.WARNING,
          "INVALID_SERVER_NAME_FORMAT",
          `Server name "${serverName}" should be a valid identifier (alphanumeric, underscore, hyphen)`,
          "serverName",
          serverName,
        ),
      );
    }
  }

  // Validate config object
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "INVALID_CONFIG_TYPE",
        "Server configuration must be a plain object",
        "config",
        config,
      ),
    );
    return categorizeIssues(issues);
  }

  // Validate command
  if (!config.command || typeof config.command !== "string") {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "MISSING_COMMAND",
        "Server configuration must have a command",
        "command",
        config.command,
      ),
    );
  } else {
    if (config.command.length > VALIDATION_CONFIG.MAX_COMMAND_LENGTH) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "COMMAND_TOO_LONG",
          `Command is too long (max ${VALIDATION_CONFIG.MAX_COMMAND_LENGTH} characters)`,
          "command",
          config.command,
        ),
      );
    }

    // Security checks
    issues.push(...isCommandSafe(config.command));

    // Existence check (for absolute paths)
    if (isAbsolute(config.command)) {
      issues.push(...(await checkCommandExists(config.command)));
    }
  }

  // Validate args
  if (!Array.isArray(config.args)) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "INVALID_ARGS_TYPE",
        "Server arguments must be an array",
        "args",
        config.args,
      ),
    );
  } else {
    if (config.args.length > VALIDATION_CONFIG.MAX_ARGS_COUNT) {
      issues.push(
        createIssue(
          ValidationSeverity.WARNING,
          "TOO_MANY_ARGS",
          `Too many arguments (${config.args.length}), maximum recommended is ${VALIDATION_CONFIG.MAX_ARGS_COUNT}`,
          "args",
        ),
      );
    }

    config.args.forEach((arg, index) => {
      if (typeof arg !== "string") {
        issues.push(
          createIssue(
            ValidationSeverity.ERROR,
            "INVALID_ARG_TYPE",
            `Argument at index ${index} must be a string`,
            `args[${index}]`,
            arg,
          ),
        );
      } else if (arg.length > VALIDATION_CONFIG.MAX_ARG_LENGTH) {
        issues.push(
          createIssue(
            ValidationSeverity.ERROR,
            "ARG_TOO_LONG",
            `Argument at index ${index} is too long (max ${VALIDATION_CONFIG.MAX_ARG_LENGTH} characters)`,
            `args[${index}]`,
            arg,
          ),
        );
      }
    });
  }

  // Validate environment variables
  issues.push(...validateEnvironmentVariables(config.env));

  return categorizeIssues(issues);
}

/**
 * Validate MCP servers configuration
 */
export async function validateMCPServers(mcpServers: MCPServersConfig): Promise<DetailedValidationResult> {
  const issues: ValidationIssue[] = [];

  if (!mcpServers || typeof mcpServers !== "object" || Array.isArray(mcpServers)) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "INVALID_SERVERS_TYPE",
        "MCP servers configuration must be a plain object",
        "mcpServers",
        mcpServers,
      ),
    );
    return categorizeIssues(issues);
  }

  const serverNames = Object.keys(mcpServers);
  if (serverNames.length === 0) {
    issues.push(
      createIssue(
        ValidationSeverity.WARNING,
        "NO_SERVERS_CONFIGURED",
        "No MCP servers configured in profile",
        "mcpServers",
      ),
    );
  }

  // Validate each server
  for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
    const serverValidation = await validateMCPServer(serverName, serverConfig);

    // Prefix field names with server name for context
    const prefixedIssues = [...serverValidation.errors, ...serverValidation.warnings, ...serverValidation.info].map(
      (issue) => ({
        ...issue,
        field: issue.field ? `mcpServers.${serverName}.${issue.field}` : `mcpServers.${serverName}`,
      }),
    );

    issues.push(...prefixedIssues);
  }

  return categorizeIssues(issues);
}

/**
 * Validate complete MCP profile
 */
export async function validateProfile(profile: Partial<MCPProfile>): Promise<DetailedValidationResult> {
  const issues: ValidationIssue[] = [];

  // Validate ID
  if (!profile.id || typeof profile.id !== "string") {
    issues.push(createIssue(ValidationSeverity.ERROR, "MISSING_ID", "Profile must have a valid ID", "id", profile.id));
  }

  // Validate name
  if (!profile.name || typeof profile.name !== "string") {
    issues.push(
      createIssue(ValidationSeverity.ERROR, "MISSING_NAME", "Profile must have a name", "name", profile.name),
    );
  } else {
    if (profile.name.trim().length === 0) {
      issues.push(
        createIssue(ValidationSeverity.ERROR, "EMPTY_NAME", "Profile name cannot be empty", "name", profile.name),
      );
    }

    if (profile.name.length > VALIDATION_CONFIG.MAX_PROFILE_NAME_LENGTH) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "NAME_TOO_LONG",
          `Profile name is too long (max ${VALIDATION_CONFIG.MAX_PROFILE_NAME_LENGTH} characters)`,
          "name",
          profile.name,
        ),
      );
    }

    // Check for potentially problematic characters
    if (/[<>:"/\\|?*]/.test(profile.name)) {
      issues.push(
        createIssue(
          ValidationSeverity.WARNING,
          "INVALID_NAME_CHARS",
          "Profile name contains characters that may cause issues",
          "name",
          profile.name,
        ),
      );
    }
  }

  // Validate description (optional)
  if (profile.description !== undefined) {
    if (typeof profile.description !== "string") {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "INVALID_DESCRIPTION_TYPE",
          "Profile description must be a string",
          "description",
          profile.description,
        ),
      );
    } else if (profile.description.length > VALIDATION_CONFIG.MAX_DESCRIPTION_LENGTH) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "DESCRIPTION_TOO_LONG",
          `Profile description is too long (max ${VALIDATION_CONFIG.MAX_DESCRIPTION_LENGTH} characters)`,
          "description",
          profile.description,
        ),
      );
    }
  }

  // Validate createdAt
  if (!profile.createdAt) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "MISSING_CREATED_AT",
        "Profile must have a creation date",
        "createdAt",
        profile.createdAt,
      ),
    );
  } else if (!(profile.createdAt instanceof Date) || isNaN(profile.createdAt.getTime())) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "INVALID_CREATED_AT",
        "Profile creation date must be a valid Date object",
        "createdAt",
        profile.createdAt,
      ),
    );
  }

  // Validate lastUsed (optional)
  if (profile.lastUsed !== undefined) {
    if (!(profile.lastUsed instanceof Date) || isNaN(profile.lastUsed.getTime())) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "INVALID_LAST_USED",
          "Profile last used date must be a valid Date object",
          "lastUsed",
          profile.lastUsed,
        ),
      );
    }
  }

  // Validate MCP servers
  if (!profile.mcpServers) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "MISSING_MCP_SERVERS",
        "Profile must have MCP servers configuration",
        "mcpServers",
        profile.mcpServers,
      ),
    );
  } else {
    const serversValidation = await validateMCPServers(profile.mcpServers);
    issues.push(...serversValidation.errors, ...serversValidation.warnings, ...serversValidation.info);
  }

  return categorizeIssues(issues);
}

/**
 * Validate Claude Desktop configuration structure
 */
export function validateConfiguration(config: unknown): DetailedValidationResult {
  const issues: ValidationIssue[] = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    issues.push(
      createIssue(
        ValidationSeverity.ERROR,
        "INVALID_CONFIG_STRUCTURE",
        "Configuration must be a plain object",
        "config",
        config,
      ),
    );
    return categorizeIssues(issues);
  }

  // Type assertion after validation
  const configObj = config as Record<string, unknown>;

  // Validate mcpServers if present
  if (configObj.mcpServers !== undefined) {
    if (typeof configObj.mcpServers !== "object" || Array.isArray(configObj.mcpServers)) {
      issues.push(
        createIssue(
          ValidationSeverity.ERROR,
          "INVALID_MCP_SERVERS_TYPE",
          "mcpServers must be a plain object",
          "mcpServers",
          configObj.mcpServers,
        ),
      );
    }
  }

  // Check for unknown top-level properties (info level)
  const knownProperties = ["mcpServers"];
  const unknownProperties = Object.keys(configObj).filter((key) => !knownProperties.includes(key));

  for (const prop of unknownProperties) {
    issues.push(
      createIssue(
        ValidationSeverity.INFO,
        "UNKNOWN_PROPERTY",
        `Unknown configuration property: ${prop}`,
        prop,
        configObj[prop],
      ),
    );
  }

  return categorizeIssues(issues);
}

/**
 * Categorize validation issues by severity
 */
function categorizeIssues(issues: ValidationIssue[]): DetailedValidationResult {
  const errors = issues.filter((issue) => issue.severity === ValidationSeverity.ERROR);
  const warnings = issues.filter((issue) => issue.severity === ValidationSeverity.WARNING);
  const info = issues.filter((issue) => issue.severity === ValidationSeverity.INFO);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/**
 * Convert detailed validation result to simple ValidationResult
 */
export function toSimpleValidationResult(result: DetailedValidationResult): ValidationResult {
  return {
    valid: result.valid,
    errors: result.errors.map((issue) => issue.message),
  };
}

/**
 * Format validation result for user display
 */
export function formatValidationResult(result: DetailedValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push("✅ Validation passed");
  } else {
    lines.push("❌ Validation failed");
  }

  if (result.errors.length > 0) {
    lines.push("\n🚨 Errors:");
    result.errors.forEach((error) => {
      const field = error.field ? ` (${error.field})` : "";
      lines.push(`  • ${error.message}${field}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push("\n⚠️ Warnings:");
    result.warnings.forEach((warning) => {
      const field = warning.field ? ` (${warning.field})` : "";
      lines.push(`  • ${warning.message}${field}`);
    });
  }

  if (result.info.length > 0) {
    lines.push("\nℹ️ Info:");
    result.info.forEach((info) => {
      const field = info.field ? ` (${info.field})` : "";
      lines.push(`  • ${info.message}${field}`);
    });
  }

  return lines.join("\n");
}

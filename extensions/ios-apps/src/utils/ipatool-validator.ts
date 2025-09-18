import { existsSync, accessSync, constants } from "fs";
import { spawnSync, spawn, ChildProcess } from "child_process";
import { showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { IPATOOL_PATH, validateExecutablePath } from "./paths";
import { logger } from "./logger";

// Constants
const IPATOOL_GITHUB_URL = "https://github.com/majd/ipatool";
const DEFAULT_COMMAND_TIMEOUT = 30000; // 30 seconds
const DEFAULT_VALIDATION_TIMEOUT = 5000; // 5 seconds
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB max output size
const ALLOWED_IPATOOL_COMMANDS = ["--version", "download", "search", "auth", "purchase"] as const;

/**
 * Validates that ipatool is installed and accessible
 * @returns Promise<boolean> - true if ipatool is available, false otherwise
 */
export async function validateIpatoolInstallation(): Promise<boolean> {
  try {
    // First check if the file exists at the expected path
    if (!existsSync(IPATOOL_PATH)) {
      await showIpatoolNotFoundError();
      return false;
    }

    // Validate the ipatool path is safe and secure
    try {
      validateExecutablePath(IPATOOL_PATH);
    } catch (pathError) {
      logger.error(`[ipatool] Unsafe ipatool path: ${IPATOOL_PATH}`, pathError);
      await showIpatoolSecurityError(pathError);
      return false;
    }

    // Check file permissions
    try {
      accessSync(IPATOOL_PATH, constants.F_OK | constants.X_OK);
    } catch (permError) {
      logger.error(`[ipatool] Permission error for: ${IPATOOL_PATH}`, permError);
      await showIpatoolExecutionError(permError);
      return false;
    }

    // Try to execute ipatool to verify it works with enhanced security
    const validation = await executeIpatoolCommand(["--version"], {
      timeout: DEFAULT_VALIDATION_TIMEOUT,
      skipOutputValidation: true,
    });

    if (validation.success) {
      logger.log(`[ipatool] Found working ipatool at: ${IPATOOL_PATH}`);
      return true;
    } else {
      await showIpatoolExecutionError(validation.error || new Error("Unknown validation error"));
      return false;
    }
  } catch (error) {
    logger.error("[ipatool] Validation error:", error);
    await showGenericIpatoolError(error);
    return false;
  }
}

/**
 * Shows error when ipatool is not found at expected path
 */
async function showIpatoolNotFoundError(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "ipatool not found",
    message: `Not found at: ${IPATOOL_PATH}`,
    primaryAction: {
      title: "Install ipatool",
      onAction: () => {
        open(IPATOOL_GITHUB_URL);
      },
    },
    secondaryAction: {
      title: "Check Installation",
      onAction: () => {
        showInstallationInstructions();
      },
    },
  });

  logger.error(`[ipatool] Not found at expected path: ${IPATOOL_PATH}`);
}

/**
 * Shows error when ipatool exists but can't be executed
 */
async function showIpatoolExecutionError(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "ipatool execution failed",
    message: "Found but cannot execute",
    primaryAction: {
      title: "Check Permissions",
      onAction: () => {
        showPermissionInstructions();
      },
    },
  });

  logger.error(`[ipatool] Execution failed:`, error);
}

/**
 * Shows error when ipatool path is deemed unsafe
 */
async function showIpatoolSecurityError(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "ipatool security error",
    message: "Unsafe executable path detected",
    primaryAction: {
      title: "Check Installation",
      onAction: () => {
        showInstallationInstructions();
      },
    },
  });

  logger.error(`[ipatool] Security error:`, error);
}

/**
 * Shows generic ipatool error
 */
async function showGenericIpatoolError(error: unknown): Promise<void> {
  await showFailureToast(error, { title: "ipatool validation failed" });
}

/**
 * Shows installation instructions
 */
async function showInstallationInstructions(): Promise<void> {
  const instructions = `
# Install ipatool using Homebrew (recommended):
brew install ipatool

# Alternative: Manual installation
# 1. Download from: ${IPATOOL_GITHUB_URL}/releases
# 2. Place in /opt/homebrew/bin/ (Apple Silicon) or /usr/local/bin/ (Intel)
# 3. Make executable: chmod +x /path/to/ipatool

# Current expected path: ${IPATOOL_PATH}
  `.trim();

  await showToast({
    style: Toast.Style.Failure,
    title: "Installation Instructions",
    message: "Check console for details",
  });

  console.log("[ipatool] Installation Instructions:");
  console.log(instructions);
}

/**
 * Shows permission fix instructions
 */
async function showPermissionInstructions(): Promise<void> {
  const instructions = `
# Fix ipatool permissions:
chmod +x "${IPATOOL_PATH}"

# If still not working, try:
sudo chmod +x "${IPATOOL_PATH}"

# Or reinstall with Homebrew:
brew uninstall ipatool
brew install ipatool
  `.trim();

  await showToast({
    style: Toast.Style.Failure,
    title: "Permission Fix Instructions",
    message: "Check console for details",
  });

  console.log("[ipatool] Permission Fix Instructions:");
  console.log(instructions);
}

/**
 * Attempts to find ipatool in common locations with enhanced security
 * @returns string | null - path to ipatool if found, null otherwise
 */
export function findIpatoolPath(): string | null {
  const commonPaths = [
    "/opt/homebrew/bin/ipatool", // Homebrew on Apple Silicon
    "/usr/local/bin/ipatool", // Homebrew on Intel
    "/usr/bin/ipatool", // System installation
    `${process.env.HOME}/.local/bin/ipatool`, // User local installation
    `${process.env.HOME}/bin/ipatool`, // User bin directory
  ];

  for (const candidatePath of commonPaths) {
    if (existsSync(candidatePath)) {
      try {
        // Validate path security before testing
        validateExecutablePath(candidatePath);

        // Check permissions
        accessSync(candidatePath, constants.F_OK | constants.X_OK);

        // Test execution
        const result = spawnSync(candidatePath, ["--version"], {
          timeout: DEFAULT_VALIDATION_TIMEOUT,
          encoding: "utf8",
          maxBuffer: MAX_OUTPUT_SIZE,
        });

        if (result.status === 0) {
          logger.log(`[ipatool] Found working ipatool at: ${candidatePath}`);
          return candidatePath;
        } else {
          logger.log(`[ipatool] Found but non-functional ipatool at: ${candidatePath}`);
        }
      } catch (error) {
        logger.log(`[ipatool] Found but unusable ipatool at: ${candidatePath}`, error);
      }
    }
  }

  // Try to find in PATH with security validation
  try {
    const result = spawnSync("which", ["ipatool"], {
      encoding: "utf8",
      timeout: DEFAULT_VALIDATION_TIMEOUT,
      maxBuffer: 1024, // Small buffer for which command
    });

    if (result.status === 0 && result.stdout) {
      const pathResult = result.stdout.toString().trim();
      if (pathResult && existsSync(pathResult)) {
        try {
          // Validate the found path
          validateExecutablePath(pathResult);
          accessSync(pathResult, constants.F_OK | constants.X_OK);
          logger.log(`[ipatool] Found ipatool in PATH: ${pathResult}`);
          return pathResult;
        } catch (error) {
          logger.log(`[ipatool] Found ipatool in PATH but unusable: ${pathResult}`, error);
        }
      }
    }
  } catch {
    // ipatool not in PATH or which command failed
  }

  return null;
}

/**
 * Interface for command execution options
 */
interface CommandExecutionOptions {
  timeout?: number;
  maxBuffer?: number;
  skipOutputValidation?: boolean;
  allowedCommands?: readonly string[];
}

/**
 * Interface for command execution result
 */
interface CommandExecutionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: Error;
  exitCode?: number;
}

/**
 * Safely execute ipatool commands with comprehensive validation
 * @param args Command arguments (will be validated against allowed commands)
 * @param options Execution options
 * @returns Promise<CommandExecutionResult>
 */
export async function executeIpatoolCommand(
  args: string[],
  options: CommandExecutionOptions = {},
): Promise<CommandExecutionResult> {
  const {
    timeout = DEFAULT_COMMAND_TIMEOUT,
    maxBuffer = MAX_OUTPUT_SIZE,
    skipOutputValidation = false,
    allowedCommands = ALLOWED_IPATOOL_COMMANDS,
  } = options;

  try {
    // Validate ipatool path
    if (!existsSync(IPATOOL_PATH)) {
      return {
        success: false,
        error: new Error(`ipatool not found at: ${IPATOOL_PATH}`),
      };
    }

    // Validate path security
    try {
      validateExecutablePath(IPATOOL_PATH);
    } catch (pathError) {
      return {
        success: false,
        error: new Error(`Unsafe ipatool path: ${pathError instanceof Error ? pathError.message : String(pathError)}`),
      };
    }

    // Sanitize and validate arguments
    const sanitizedArgs = validateAndSanitizeArgs(args, allowedCommands);
    if (!sanitizedArgs) {
      const redacted = redactArgsForLogging(args);
      return {
        success: false,
        error: new Error(`Invalid or disallowed command arguments: ${redacted.join(" ")}`),
      };
    }

    const redactedArgsForLog = redactArgsForLogging(sanitizedArgs);
    logger.log(`[ipatool] Executing command: ${IPATOOL_PATH} ${redactedArgsForLog.join(" ")}`);

    // Execute command using spawnSync for simplicity and timeout control
    const result = spawnSync(IPATOOL_PATH, sanitizedArgs, {
      timeout,
      maxBuffer,
      encoding: "utf8",
      windowsHide: true, // Hide window on Windows
      stdio: ["ignore", "pipe", "pipe"], // stdin ignored, capture stdout/stderr
    });

    // Handle timeout
    if (result.signal === "SIGTERM" && result.status === null) {
      return {
        success: false,
        error: new Error(`Command timed out after ${timeout}ms`),
      };
    }

    // Handle execution errors
    if (result.error) {
      return {
        success: false,
        error: result.error,
        exitCode: result.status || undefined,
      };
    }

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    // Validate output size if not skipped
    if (!skipOutputValidation) {
      if (stdout.length > maxBuffer || stderr.length > maxBuffer) {
        return {
          success: false,
          error: new Error("Command output exceeded maximum allowed size"),
        };
      }
    }

    // Command succeeded
    if (result.status === 0) {
      return {
        success: true,
        stdout,
        stderr,
        exitCode: result.status,
      };
    }

    // Command failed
    return {
      success: false,
      stdout,
      stderr,
      exitCode: result.status || undefined,
      error: new Error(`Command failed with exit code ${result.status}: ${stderr || "Unknown error"}`),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Validate and sanitize command arguments
 * @param args Raw arguments
 * @param allowedCommands List of allowed command patterns
 * @returns Sanitized arguments or null if invalid
 */
function validateAndSanitizeArgs(args: string[], allowedCommands: readonly string[]): string[] | null {
  if (!Array.isArray(args) || args.length === 0) {
    return null;
  }

  // Check if the first argument (command) is allowed
  const command = args[0];
  const isAllowedCommand = allowedCommands.some((allowed) => {
    if (allowed.startsWith("--")) {
      return command === allowed;
    }
    return command === allowed;
  });

  if (!isAllowedCommand) {
    logger.error(`[ipatool] Disallowed command: ${command}`);
    return null;
  }

  // Sanitize all arguments
  const sanitizedArgs: string[] = [];
  const sensitiveValueFlags = new Set([
    "-p",
    "--password",
    "-e",
    "--email",
    "--username",
    "--auth-code",
    "--2fa",
    "--otp",
    "--code",
  ]);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== "string") {
      logger.error(`[ipatool] Invalid argument type: ${typeof arg}`);
      return null;
    }

    const prev = i > 0 ? args[i - 1] : undefined;
    const isSensitiveValue = prev ? sensitiveValueFlags.has(prev) : false;

    if (!isSensitiveValue) {
      // Check for dangerous patterns only on non-sensitive tokens (flags/command/subcommand/paths)
      if (containsDangerousPatterns(arg)) {
        logger.error(`[ipatool] Dangerous pattern detected in argument: ${arg}`);
        return null;
      }

      // For file paths and bundle IDs, apply additional sanitization
      if (arg.includes("/") || arg.includes("\\\\")) {
        try {
          // Validate file paths
          const sanitizedPath = validateExecutablePath(arg);
          sanitizedArgs.push(sanitizedPath);
        } catch {
          // If path validation fails, treat as regular string but sanitize
          sanitizedArgs.push(sanitizeArgument(arg));
        }
      } else {
        sanitizedArgs.push(sanitizeArgument(arg));
      }
    } else {
      // For sensitive values (passwords, emails, auth codes), skip dangerous/path validation
      sanitizedArgs.push(sanitizeArgument(arg));
    }
  }

  return sanitizedArgs;
}

/**
 * Check for dangerous patterns in arguments
 * @param arg Argument to check
 * @returns true if dangerous patterns found
 */
function containsDangerousPatterns(arg: string): boolean {
  const dangerousPatterns = [
    /[;&|`$(){}]/, // Shell metacharacters
    /\$\(/, // Command substitution
    /\s*\|\s*/, // Pipes
    /\s*>\s*/, // Redirections
    /\s*<\s*/, // Input redirections
    /\\x[0-9a-fA-F]{2}/, // Hex escapes
    /\\[0-7]{1,3}/, // Octal escapes
  ];

  return dangerousPatterns.some((pattern) => pattern.test(arg));
}

/**
 * Sanitize individual argument
 * @param arg Argument to sanitize
 * @returns Sanitized argument
 */
function sanitizeArgument(arg: string): string {
  // Remove control characters using a safer approach
  let sanitized = "";
  for (let i = 0; i < arg.length; i++) {
    const charCode = arg.charCodeAt(i);
    // Keep printable ASCII characters (32-126) and some common Unicode characters
    if ((charCode >= 32 && charCode <= 126) || charCode >= 128) {
      sanitized += arg.charAt(i);
    }
  }

  return sanitized.trim().substring(0, 1000); // Limit length
}

/**
 * Redact sensitive values in args for logging only
 * Masks values following flags like -p/--password, -e/--email/--username, and --auth-code/--2fa/--otp/--code
 */
function redactArgsForLogging(args: string[]): string[] {
  const copy = [...args];
  for (let i = 0; i < copy.length; i++) {
    const a = copy[i];
    if (a === "-p" || a === "--password") {
      if (i + 1 < copy.length) copy[i + 1] = "***";
    }
    if (a === "-e" || a === "--email" || a === "--username") {
      if (i + 1 < copy.length) copy[i + 1] = "***";
    }
    if (a === "--auth-code" || a === "--2fa" || a === "--otp" || a === "--code") {
      if (i + 1 < copy.length) copy[i + 1] = "******";
    }
  }
  return copy;
}

/**
 * Create a secure spawn process for ipatool with proper cleanup
 * @param args Command arguments
 * @param options Spawn options
 * @returns Promise<ChildProcess>
 */
export function createSecureIpatoolProcess(
  args: string[],
  options: CommandExecutionOptions = {},
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    try {
      // Validate arguments first
      const sanitizedArgs = validateAndSanitizeArgs(args, options.allowedCommands || ALLOWED_IPATOOL_COMMANDS);
      if (!sanitizedArgs) {
        const redacted = redactArgsForLogging(args);
        reject(new Error(`Invalid arguments: ${redacted.join(" ")}`));
        return;
      }

      // Validate ipatool path
      validateExecutablePath(IPATOOL_PATH);

      const redactedArgsForLog = redactArgsForLogging(sanitizedArgs);
      logger.log(`[ipatool] Creating secure process: ${IPATOOL_PATH} ${redactedArgsForLog.join(" ")}`);

      // Create the child process with security options
      const child = spawn(IPATOOL_PATH, sanitizedArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        // Additional security on Unix-like systems
        uid: process.getuid?.(),
        gid: process.getgid?.(),
      });

      // Set up timeout if specified
      if (options.timeout && options.timeout > 0) {
        const timeoutId = setTimeout(() => {
          logger.log(`[ipatool] Process timeout after ${options.timeout}ms, killing process`);
          child.kill("SIGTERM");

          // Force kill after additional grace period
          setTimeout(() => {
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          }, 5000);
        }, options.timeout);

        child.on("exit", () => {
          clearTimeout(timeoutId);
        });
      }

      resolve(child);
    } catch (error) {
      reject(error);
    }
  });
}

import { ChildProcess } from "child_process";
import { logger } from "./logger";
import { analyzeIpatoolError } from "./ipatool-error-patterns";
import { createSecureIpatoolProcess, executeIpatoolCommand } from "./ipatool-validator";

export interface AuthInfo {
  authenticated: boolean;
  success?: boolean;
  account?: Record<string, unknown> | null;
  error?: string;
  raw?: string;
}

export interface LoginOptions {
  email: string;
  password: string;
  code?: string; // 2FA code
  // Called when ipatool indicates a 2FA code is required
  onTwoFactorPrompt?: (message?: string) => void;
}

export interface LoginResult {
  success: boolean;
  needs2FA: boolean;
  message?: string;
  raw?: string;
}

// Detect common 2FA prompt strings from ipatool output
function detectTwoFactorPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("2fa code is required") ||
    lower.includes("enter 2fa code") ||
    lower.includes("two-factor") ||
    lower.includes("2fa") ||
    lower.includes("verification code")
  );
}

/**
 * Get current ipatool authentication info
 */
export async function getAuthInfo(): Promise<AuthInfo> {
  const args = ["auth", "info", "--format", "json", "--non-interactive"];
  const result = await executeIpatoolCommand(args, { timeout: 15000, allowedCommands: ["auth"] });

  // ipatool returns exit code 1 when not authenticated; treat as a valid response we can parse
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  try {
    if (stdout.trim()) {
      const parsed = JSON.parse(stdout);
      // Support both shapes: { authenticated: true } or { success: true }
      const authenticated = Boolean(parsed.authenticated || parsed.success);
      return { authenticated, success: parsed.success, account: parsed.account ?? null, raw: stdout };
    }
  } catch (e) {
    // Fall through to textual checks below
  }

  const combined = (stdout + "\n" + stderr).toLowerCase();
  if (combined.includes("not authenticated") || combined.includes("failed to get account")) {
    return { authenticated: false, error: stderr || stdout, raw: stdout || stderr };
  }

  // If command ran successfully but we couldn't parse, assume authenticated
  if (result.success) {
    return { authenticated: true, raw: stdout };
  }

  // Generic fallback
  return { authenticated: false, error: result.error?.message || "Unknown auth info error", raw: stdout || stderr };
}

/**
 * Login to Apple ID via ipatool. Supports optional 2FA code and prompt detection.
 */
export async function login({ email, password, code, onTwoFactorPrompt }: LoginOptions): Promise<LoginResult> {
  const args = ["auth", "login", "-e", email, "-p", password, "--format", "json", "--non-interactive"];

  if (code) {
    // Use ipatool's documented 2FA flag
    args.push("--auth-code", code);
  }

  let stdout = "";
  let stderr = "";
  let twoFANotified = false;

  const child: ChildProcess = await createSecureIpatoolProcess(args, { timeout: 30000, allowedCommands: ["auth"] });

  if (child.stdout) {
    child.stdout.on("data", (data: Buffer | string) => {
      const chunk = data.toString();
      stdout += chunk;
      // Detect and surface 2FA prompt messages in real-time
      if (!twoFANotified && detectTwoFactorPrompt(chunk)) {
        twoFANotified = true;
        try {
          onTwoFactorPrompt?.("Two-factor authentication required. Enter the 6-digit code.");
        } catch (_) {
          // Ignore callback errors
        }
      }
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (data: Buffer | string) => {
      const chunk = data.toString();
      stderr += chunk;
    });
  }

  return new Promise<LoginResult>((resolve, reject) => {
    child.on("error", (err) => {
      logger.error("[ipatool-auth] login process error", err);
      reject(err);
    });

    child.on("close", (code: number | null) => {
      const combined = (stdout + stderr).trim();

      if (code === 0) {
        logger.log("[ipatool-auth] login successful");
        resolve({ success: true, needs2FA: false, raw: stdout });
        return;
      }

      // Analyze the output to determine if 2FA is required
      const info = analyzeIpatoolError(combined, stderr, "auth");
      if (info.is2FARequired) {
        logger.log("[ipatool-auth] 2FA required");
        resolve({ success: false, needs2FA: true, message: info.userMessage, raw: combined });
        return;
      }

      // Credential or other auth errors -> reject with friendly message
      const message = info.userMessage || `Authentication failed (exit code ${code ?? "unknown"})`;
      logger.error("[ipatool-auth] login failed:", message);
      reject(new Error(message));
    });
  });
}

/**
 * Revoke ipatool authentication (logout)
 */
export async function revoke(): Promise<boolean> {
  const args = ["auth", "revoke", "--non-interactive"];
  const result = await executeIpatoolCommand(args, { timeout: 15000, allowedCommands: ["auth"] });

  if (result.success) {
    logger.log("[ipatool-auth] revoked authentication");
    return true;
  }

  const msg = result.error?.message || result.stderr || "Unknown revoke error";
  const info = analyzeIpatoolError(msg, result.stderr, "auth");
  logger.error("[ipatool-auth] revoke failed:", info.userMessage);
  throw new Error(info.userMessage);
}

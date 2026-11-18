/**
 * Password Manager for WebBlocker
 * Handles secure password caching for single authentication per session
 */

import { exec } from "child_process";
import { promisify } from "util";
import { escapeShellArg } from "./securityUtils";

const execAsync = promisify(exec);

interface PasswordSession {
  hashedPassword: string;
  expiryTime: number;
  sessionId: string;
}

class PasswordManager {
  private static instance: PasswordManager;
  private session: PasswordSession | null = null;
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  private constructor() {}

  public static getInstance(): PasswordManager {
    if (!PasswordManager.instance) {
      PasswordManager.instance = new PasswordManager();
    }
    return PasswordManager.instance;
  }

  /**
   * Prompts for password if not cached or expired
   * @returns Promise resolving when password is available
   */
  public async ensurePassword(): Promise<void> {
    if (this.isSessionValid()) {
      return; // Password already cached and valid
    }

    // Clear any existing session
    this.session = null;

    // Use AppleScript to get admin privileges (shows native macOS password dialog)
    try {
      // Run a simple command with AppleScript to authenticate
      await execAsync(
        "osascript -e 'do shell script \"sudo -v\" with administrator privileges'",
      );

      // Create a new session
      this.session = {
        hashedPassword: this.generateSessionId(), // We don't store the actual password
        expiryTime: Date.now() + this.SESSION_DURATION,
        sessionId: this.generateSessionId(),
      };

      console.log("Password session established");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message.includes("User canceled")) {
        throw new Error("Authentication was canceled by user");
      }
      throw new Error("Authentication failed");
    }
  }

  /**
   * Executes a command with admin privileges using cached authentication
   * @param command - Shell command to execute
   * @returns Promise resolving to command output
   */
  public async executeWithCachedAuth(command: string): Promise<string> {
    // Ensure we have a valid password session
    await this.ensurePassword();

    try {
      // Execute the command with sudo using AppleScript (uses cached admin session)
      // Properly escape the command for shell execution
      const escapedCommand = escapeShellArg(command);
      const applescriptCmd = `osascript -e 'do shell script ${escapedCommand} with administrator privileges'`;
      const { stdout } = await execAsync(applescriptCmd);
      return stdout.trim();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // If execution fails, might be session expired
      if (error.message.includes("User canceled")) {
        throw new Error("Authentication was canceled by user");
      }
      throw error;
    }
  }

  /**
   * Checks if the current session is valid
   */
  private isSessionValid(): boolean {
    if (!this.session) {
      return false;
    }

    if (Date.now() > this.session.expiryTime) {
      this.session = null;
      return false;
    }

    return true;
  }

  /**
   * Generates a random session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Clears the current password session
   */
  public async clearSession(): Promise<void> {
    this.session = null;
    // Also clear sudo timestamp
    try {
      await execAsync("sudo -k");
    } catch {
      // Ignore errors when clearing sudo timestamp
    }
  }

  /**
   * Gets session info for debugging
   */
  public getSessionInfo(): { isValid: boolean; expiresIn?: number } {
    if (!this.session) {
      return { isValid: false };
    }

    const expiresIn = this.session.expiryTime - Date.now();
    return {
      isValid: expiresIn > 0,
      expiresIn: Math.max(0, Math.floor(expiresIn / 1000)), // in seconds
    };
  }
}

export default PasswordManager;

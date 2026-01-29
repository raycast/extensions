/**
 * OpenCode server lifecycle management for Raycast extension
 *
 * This module handles starting and managing an OpenCode server instance
 * dedicated to the Raycast extension on a separate port with password protection.
 */

import { spawn, execSync, ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { LocalStorage } from "@raycast/api";
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import type { ServerStatus } from "./types";

// Use a dedicated port for Raycast to avoid conflicts with user's OpenCode instances
const RAYCAST_OPENCODE_PORT = 14096;
const RAYCAST_OPENCODE_HOSTNAME = "127.0.0.1";
const SERVER_STARTUP_TIMEOUT = 15000; // 15 seconds

// Storage key for the server password
const PASSWORD_STORAGE_KEY = "opencode-server-password";

// Default username for HTTP Basic Auth (as per OpenCode docs)
const OPENCODE_USERNAME = "opencode";

// Server process singleton
let serverProcess: ChildProcess | null = null;

// Cached password (loaded from storage)
let cachedPassword: string | null = null;

/**
 * Generate a secure random password
 */
function generatePassword(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Get or create the server password
 * Password is stored in Raycast's LocalStorage so it persists between sessions
 */
async function getOrCreatePassword(): Promise<string> {
  if (cachedPassword) {
    return cachedPassword;
  }

  // Try to load from storage
  const storedPassword =
    await LocalStorage.getItem<string>(PASSWORD_STORAGE_KEY);

  if (storedPassword) {
    cachedPassword = storedPassword;
    return storedPassword;
  }

  // Generate and store a new password
  const newPassword = generatePassword();
  await LocalStorage.setItem(PASSWORD_STORAGE_KEY, newPassword);
  cachedPassword = newPassword;

  return newPassword;
}

/**
 * Find the opencode binary path
 * Raycast runs in a sandboxed environment without access to shell PATH
 */
function findOpencodeBinary(): string | null {
  const possiblePaths = [
    // OpenCode's own install location
    join(homedir(), ".opencode", "bin", "opencode"),
    // Homebrew on Apple Silicon
    "/opt/homebrew/bin/opencode",
    // Homebrew on Intel Mac
    "/usr/local/bin/opencode",
    // npm global (common locations)
    join(homedir(), ".npm-global", "bin", "opencode"),
    join(homedir(), "node_modules", ".bin", "opencode"),
    // pnpm global
    join(homedir(), ".local", "share", "pnpm", "opencode"),
    // Volta
    join(homedir(), ".volta", "bin", "opencode"),
    // nvm default location
    join(homedir(), ".nvm", "versions", "node", "current", "bin", "opencode"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get the base URL for the OpenCode server
 */
export function getServerUrl(): string {
  return `http://${RAYCAST_OPENCODE_HOSTNAME}:${RAYCAST_OPENCODE_PORT}`;
}

/**
 * Create HTTP Basic Auth header
 */
function createBasicAuthHeader(password: string): string {
  const credentials = `${OPENCODE_USERNAME}:${password}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

/**
 * Create a client for the OpenCode server with authentication
 */
function createAuthenticatedClient(password: string) {
  return createOpencodeClient({
    baseUrl: getServerUrl(),
    headers: {
      Authorization: createBasicAuthHeader(password),
    },
  });
}

/**
 * Check if the server is healthy using the stored password
 */
export async function checkServerHealth(): Promise<ServerStatus> {
  try {
    const password = await getOrCreatePassword();
    const client = createAuthenticatedClient(password);
    const health = await client.global.health();

    if (health.data?.healthy) {
      return {
        running: true,
        version: health.data.version,
      };
    }
    return { running: false, error: "Health check returned unhealthy" };
  } catch (err) {
    return {
      running: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Kill any existing process on our port
 * This handles stale servers from previous sessions
 */
function killExistingServerOnPort(): void {
  try {
    // Use lsof to find process on our port and kill it
    const result = execSync(
      `lsof -ti :${RAYCAST_OPENCODE_PORT} 2>/dev/null || true`,
      { encoding: "utf-8" },
    ).trim();

    if (result) {
      const pids = result.split("\n").filter(Boolean);
      for (const pid of pids) {
        try {
          execSync(`kill ${pid} 2>/dev/null || true`);
        } catch {
          // Ignore errors
        }
      }
      // Give the process a moment to die
      execSync("sleep 0.5");
    }
  } catch {
    // Ignore errors - we'll fail later if the port is still in use
  }
}

/**
 * Start the OpenCode server process with password protection
 */
async function startServer(): Promise<void> {
  const binaryPath = findOpencodeBinary();

  if (!binaryPath) {
    throw new Error(
      "Could not find opencode binary. Please ensure OpenCode is installed.\n" +
        "Install with: curl -fsSL https://opencode.ai/install | bash\n" +
        "Or: npm install -g opencode-ai",
    );
  }

  // Kill any existing process on our port (stale from previous sessions)
  killExistingServerOnPort();

  // Get the password to use for this server
  const password = await getOrCreatePassword();

  const args = [
    "serve",
    `--hostname=${RAYCAST_OPENCODE_HOSTNAME}`,
    `--port=${RAYCAST_OPENCODE_PORT}`,
  ];

  return new Promise((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (serverProcess) {
          serverProcess.kill();
          serverProcess = null;
        }
        reject(
          new Error(
            `Server startup timed out after ${SERVER_STARTUP_TIMEOUT}ms`,
          ),
        );
      }
    }, SERVER_STARTUP_TIMEOUT);

    let output = "";

    serverProcess = spawn(binaryPath, args, {
      env: {
        ...process.env,
        // Ensure we have a reasonable PATH for any child processes opencode might spawn
        PATH: `${process.env.PATH || ""}:/opt/homebrew/bin:/usr/local/bin:${homedir()}/.opencode/bin`,
        // Allow self-signed certificates for corporate/internal providers
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
        // Set the server password for authentication
        OPENCODE_SERVER_PASSWORD: password,
      },
      stdio: ["ignore", "pipe", "pipe"],
      // Detach the process so it continues running after we resolve
      detached: true,
    });

    serverProcess.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      const lines = output.split("\n");
      for (const line of lines) {
        // Look for the server ready message
        if (
          line.includes("opencode server listening") ||
          line.includes("listening on")
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            // Unref the process so it doesn't keep Node alive
            serverProcess?.unref();
            resolve();
          }
          return;
        }
      }
    });

    serverProcess.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
    });

    serverProcess.on("error", (error: Error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        serverProcess = null;
        reject(new Error(`Failed to spawn opencode: ${error.message}`));
      }
    });

    serverProcess.on("exit", (code: number | null) => {
      // Only reject if we haven't already resolved (server wasn't ready yet)
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        serverProcess = null;
        if (code !== 0 && code !== null) {
          reject(
            new Error(`Server exited with code ${code}\nOutput: ${output}`),
          );
        }
      } else {
        // Server exited after we thought it was ready - this is fine
        serverProcess = null;
      }
    });
  });
}

/**
 * Ensure the OpenCode server is running and return an authenticated client
 *
 * This function:
 * 1. First checks if there's already a healthy server on our port with our password
 * 2. If not, kills any existing server and starts a new one with our password
 * 3. Returns an authenticated client connected to the server
 */
export async function ensureServerRunning() {
  const password = await getOrCreatePassword();

  // First, check if there's already a healthy server on our port with our password
  const existingHealth = await checkServerHealth();

  if (existingHealth.running) {
    return createAuthenticatedClient(password);
  }

  // No healthy server (or wrong password), start a new one
  await startServer();

  // Wait a moment for the server to be fully ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify it's actually running
  const health = await checkServerHealth();

  if (!health.running) {
    throw new Error(
      `Server started but health check failed: ${health.error || "unknown error"}`,
    );
  }

  return createAuthenticatedClient(password);
}

/**
 * Get an authenticated client for the running server
 * Use this when you're confident the server is already running
 */
export async function getClient() {
  const password = await getOrCreatePassword();
  return createAuthenticatedClient(password);
}

/**
 * Stop the server process if we own it
 */
export async function stopServer() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {
      // Ignore errors on shutdown
    }
    serverProcess = null;
  }
}

/**
 * Get the port number being used
 */
export function getPort(): number {
  return RAYCAST_OPENCODE_PORT;
}

/**
 * Get the path to the opencode binary (for debugging)
 */
export function getBinaryPath(): string | null {
  return findOpencodeBinary();
}

/**
 * Reset the stored password (useful for debugging)
 */
export async function resetPassword(): Promise<void> {
  await LocalStorage.removeItem(PASSWORD_STORAGE_KEY);
  cachedPassword = null;
}

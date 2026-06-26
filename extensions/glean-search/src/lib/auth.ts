import { open } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import type { AuthInfo } from "./types";

/**
 * Read server_url from ~/.glean/config.json if it exists.
 * The Glean CLI saves the resolved server URL here after the first
 * email-based instance lookup, so subsequent runs skip the email prompt.
 */
export function readGleanConfigServerUrl(): string | null {
  try {
    const configPath = join(homedir(), ".glean", "config.json");
    const data = JSON.parse(readFileSync(configPath, "utf-8"));
    return typeof data.server_url === "string" && data.server_url ? data.server_url : null;
  } catch {
    return null;
  }
}

const execFileAsync = promisify(execFile);

/**
 * Check whether the glean CLI is authenticated.
 *
 * Runs `glean auth status` and parses the human-readable output.
 * Returns `{ state: "authenticated" }` with user/host details on success,
 * or `{ state: "unauthenticated" }` if the CLI reports no valid session.
 */
export async function checkGleanAuth(cliPath: string): Promise<AuthInfo> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: ["/usr/local/bin", "/opt/homebrew/bin", process.env.PATH].filter(Boolean).join(":"),
  };

  const serverUrl = readGleanConfigServerUrl();
  if (serverUrl) {
    env.GLEAN_SERVER_URL = serverUrl;
  }

  try {
    const { stdout } = await execFileAsync(cliPath, ["auth", "status"], {
      env,
      timeout: 5000,
      encoding: "utf-8",
    });

    // Parse text output: "✓ Authenticated as <email> (<host>)"
    const authMatch = stdout.match(/Authenticated as (.+?) \((.+?)\)/);
    if (authMatch) {
      return {
        state: "authenticated",
        user: authMatch[1].trim(),
        host: authMatch[2].trim(),
      };
    }

    return { state: "unauthenticated", error: "Could not parse auth status" };
  } catch (err) {
    const error = err as Error & { code?: string; stderr?: string; stdout?: string };
    const stderr = error.stderr?.trim();
    const stdout = error.stdout?.trim();
    const message = stdout || stderr || error.message || "Unknown error";

    // The CLI exits non-zero when not authenticated
    if (
      message.toLowerCase().includes("not authenticated") ||
      message.toLowerCase().includes("not logged in") ||
      message.toLowerCase().includes("auth status failed")
    ) {
      return { state: "unauthenticated", error: message };
    }

    return { state: "error", error: message };
  }
}

/**
 * Attempt to sign in. Spawns `glean auth login` with stdin closed so it never
 * blocks on the email prompt. Captures the OAuth authorization URL from the
 * CLI's "If your browser doesn't open, visit:" fallback message and opens it
 * via Raycast's `open()` API, which is more reliable than the CLI's built-in
 * browser launcher when running in a child process.
 */
export async function signInToGlean(cliPath: string, email?: string): Promise<{ success: boolean; message: string }> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: ["/usr/local/bin", "/opt/homebrew/bin", process.env.PATH].filter(Boolean).join(":"),
  };

  const serverUrl = readGleanConfigServerUrl();
  if (serverUrl) {
    env.GLEAN_SERVER_URL = serverUrl;
  }

  // When we have the server URL, close stdin (CLI skips email prompt).
  // Without it, the CLI needs email for instance lookup — so pipe it.
  const needsEmailStdin = !serverUrl && !!email;
  const stdio: ["pipe" | "ignore", "pipe", "pipe"] = needsEmailStdin
    ? ["pipe", "pipe", "pipe"]
    : ["ignore", "pipe", "pipe"];

  return new Promise((resolve) => {
    const child = spawn(cliPath, ["auth", "login"], {
      env,
      stdio,
    });

    // Pipe email to stdin so the CLI can do instance lookup
    if (needsEmailStdin && child.stdin) {
      child.stdin.on("error", () => {}); // swallow EPIPE if child exits before flush
      child.stdin.write(`${email}\n`);
      child.stdin.end();
    }

    let output = "";
    let authUrlOpened = false;

    const onData = (data: Buffer) => {
      const text = data.toString("utf-8");
      output += text;

      // Extract OAuth authorization URL from the CLI's fallback message
      // "If your browser doesn't open, visit:\n  https://..."
      if (!authUrlOpened) {
        const match = output.match(/https?:\/\/[^\s\n]+(?:oauth\/authorize|authorize\?)[^\s\n]*/);
        if (match) {
          authUrlOpened = true;
          open(match[0]);
        }
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        message: output ? `Sign in timed out after 60 seconds:\n${output}` : "Sign in timed out. Please try again.",
      });
    }, 60000);

    child.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ success: true, message: output || "Signed in successfully" });
      } else {
        resolve({ success: false, message: output || `Process exited with code ${code}` });
      }
    });

    child.on("error", (err: Error) => {
      clearTimeout(timeout);
      resolve({ success: false, message: err.message });
    });
  });
}

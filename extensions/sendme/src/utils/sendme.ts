import { homedir } from "os";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { Clipboard } from "@raycast/api";
import { ShareSession } from "../types";
import { globalSessions } from "../sessionManager";

// Better path finding with preference for local ./sendme
export const getSendmePath = async (): Promise<string> => {
  // Try local path first - most reliable
  if (fs.existsSync("./sendme")) {
    return "./sendme";
  }

  // Check home directory for sendme
  const homeDirSendme = path.join(homedir(), "sendme");
  if (fs.existsSync(homeDirSendme)) {
    return homeDirSendme;
  }

  // Check common brew locations
  const brewPaths = ["/usr/local/bin/sendme", "/opt/homebrew/bin/sendme"];

  for (const brewPath of brewPaths) {
    if (fs.existsSync(brewPath)) {
      return brewPath;
    }
  }

  // Last resort - check path
  try {
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>(
      (resolve) => {
        const proc = spawn("which", ["sendme"]);
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
          stdout += data.toString().trim();
        });

        proc.stderr.on("data", (data) => {
          stderr += data.toString().trim();
        });

        proc.on("close", () => {
          resolve({ stdout, stderr });
        });
      },
    );

    if (stdout && fs.existsSync(stdout)) {
      return stdout;
    }
  } catch (e) {
    // Ignore errors with which command
  }

  // If nothing works, default to './sendme' which is our expected location
  return "./sendme";
};

export const extractTicket = (output: string): string | null => {
  const lines = output.split("\n");

  // Look for "sendme receive" line
  for (const line of lines) {
    if (line.includes("sendme receive")) {
      const parts = line.split("sendme receive ");
      if (parts.length >= 2) return parts[1].trim();
    }
  }

  // Look for blob string pattern
  const blobMatch = output.match(/blob[a-zA-Z0-9]{100,}/);
  if (blobMatch) return blobMatch[0];

  return null;
};

// Fix async promise executor pattern
export const startSendmeProcess = (
  filePath: string,
  sessionId: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Helper function to handle the logic that was previously in the async function
    const initializeProcess = async () => {
      try {
        // Get the correct sendme path
        const sendmePath = await getSendmePath();
        console.log(`Using sendme path: ${sendmePath}`);

        // Get filename for display
        const fileName = path.basename(filePath);

        // Create initial session with empty ticket
        const newSession: ShareSession = {
          id: sessionId,
          process: null,
          filePath,
          fileName,
          startTime: new Date(),
          ticket: "",
        };

        // Add session at the beginning with empty ticket
        globalSessions.addSession(newSession);

        // Try to ensure we always use an absolute path for sendmePath
        let resolvedPath = sendmePath;
        if (sendmePath === "./sendme" || sendmePath === "sendme") {
          // Check if ./sendme exists in the current directory
          if (fs.existsSync("./sendme")) {
            resolvedPath = path.resolve("./sendme");
          } else {
            // Try the home directory as fallback
            const homePathSendme = path.join(homedir(), "sendme");
            if (fs.existsSync(homePathSendme)) {
              resolvedPath = homePathSendme;
            }
          }
        }

        console.log(`Resolved sendme path: ${resolvedPath}`);

        // Spawn the process with the resolved path
        const childProcess = spawn(resolvedPath, ["send", filePath], {
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
          cwd: homedir(),
          env: { ...process.env, HOME: homedir() },
        });

        let outputBuffer = "";
        let extractedTicket: string | null = null;

        childProcess.stdout.on("data", (data) => {
          const chunk = data.toString();
          console.log("Process stdout:", chunk);
          outputBuffer += chunk;
          const ticket = extractTicket(outputBuffer);
          if (ticket && !extractedTicket) {
            extractedTicket = ticket;

            // Update existing session with process and ticket
            const session = globalSessions
              .getSessions()
              .find((s) => s.id === sessionId);
            if (session) {
              session.process = childProcess;
              session.pid = childProcess.pid;
              session.ticket = ticket;
              globalSessions.notifyListeners();
              globalSessions.persistSessions();
            }

            // Copy to clipboard immediately
            Clipboard.copy(ticket);
            resolve(ticket);
          }
        });

        childProcess.stderr.on("data", (data) => {
          const chunk = data.toString();
          console.log("Process stderr:", chunk);
          outputBuffer += chunk;
          const ticket = extractTicket(outputBuffer);
          if (ticket && !extractedTicket) {
            extractedTicket = ticket;

            // Update existing session with process and ticket
            const session = globalSessions
              .getSessions()
              .find((s) => s.id === sessionId);
            if (session) {
              session.process = childProcess;
              session.pid = childProcess.pid;
              session.ticket = ticket;
              globalSessions.notifyListeners();
              globalSessions.persistSessions();
            }

            // Copy to clipboard immediately
            Clipboard.copy(ticket);
            resolve(ticket);
          }
        });

        childProcess.on("error", (err) => {
          console.error("Process error:", err);
          reject(err);
        });

        childProcess.unref();

        // Set timeout for ticket extraction
        setTimeout(() => {
          if (!extractedTicket) {
            reject(new Error("Timeout waiting for ticket"));
          }
        }, 5000);
      } catch (error) {
        console.error("Error in startSendmeProcess:", error);
        reject(error);
      }
    };

    // Call the helper function and handle errors
    initializeProcess().catch(reject);
  });
};

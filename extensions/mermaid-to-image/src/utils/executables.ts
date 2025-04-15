import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences } from "../types";

const execPromise = promisify(exec);

/**
 * Find Node.js executable path by checking common locations
 * and using various detection methods
 */
export async function findNodePath(): Promise<string> {
  // Try common locations first
  const possiblePaths = ["/usr/local/bin/node", "/opt/homebrew/bin/node", "/usr/bin/node"];

  // Check if any of these exist
  for (const nodePath of possiblePaths) {
    if (fs.existsSync(nodePath)) {
      console.log("Found Node.js at:", nodePath);
      return nodePath;
    }
  }

  // Try to find using which command
  try {
    const { stdout } = await execPromise("which node");
    if (stdout.trim()) {
      console.log("Found Node.js using which command:", stdout.trim());
      return stdout.trim();
    }
  } catch (error) {
    console.log("Could not find node using which command", error);
  }

  // Look for NVM installations
  try {
    const nvmPath = path.join(os.homedir(), ".nvm", "versions", "node");
    if (fs.existsSync(nvmPath)) {
      const dirs = fs.readdirSync(nvmPath);
      if (dirs.length > 0) {
        // Sort versions and get the latest
        const latestVersion = dirs.slice().sort().pop();
        if (latestVersion) {
          // Explicit check for latestVersion
          const nodePath = path.join(nvmPath, latestVersion, "bin", "node");
          if (fs.existsSync(nodePath)) {
            console.log("Found Node.js in NVM directory:", nodePath);
            return nodePath;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error finding NVM node:", error);
  }

  // As a last resort, try to find any node executable in home directory
  try {
    const { stdout } = await execPromise(`find ${os.homedir()} -name node -type f -perm -u+x 2>/dev/null || echo ""`);
    const paths = stdout.trim().split("\n").filter(Boolean);
    if (paths.length > 0) {
      console.log("Found Node.js in home directory:", paths[0]);
      return paths[0];
    }
  } catch (error) {
    console.error("Error searching for node in home directory:", error);
  }

  // If we can't find Node.js, throw an error
  throw new Error("Could not find Node.js installation. Please make sure Node.js is installed.");
}

/**
 * Find mmdc executable path, prioritizing user-specified custom path
 */
export async function findMmdcPath(preferences: Preferences): Promise<string> {
  // First check if user has specified a custom path
  if (preferences.customMmdcPath?.trim()) {
    const customPath = preferences.customMmdcPath.trim();
    const expandedPath = customPath.startsWith("~/") ? customPath.replace("~/", `${os.homedir()}/`) : customPath;

    if (fs.existsSync(expandedPath)) {
      console.log("Using custom mmdc path:", expandedPath);
      return expandedPath;
    } else {
      console.warn("Custom mmdc path specified but not found:", expandedPath);
      await showToast({
        style: Toast.Style.Failure,
        title: "Custom mmdc path not found",
        message: "Check your extension preferences",
      });
    }
  }

  // Check if mmdc is in PATH
  try {
    const { stdout } = await execPromise("which mmdc");
    if (stdout.trim()) {
      console.log("Found mmdc in PATH:", stdout.trim());
      return stdout.trim();
    }
  } catch (error) {
    console.log("mmdc not found in PATH, checking specific locations...");
    console.error("which mmdc error:", error instanceof Error ? error.message : String(error));

    await showToast({
      style: Toast.Style.Animated,
      title: "Looking for mermaid-cli...",
      message: "Not found in PATH, checking other locations",
    });
  }

  // Expanded list of possible paths including NVM locations
  const possiblePaths = [
    "/usr/local/bin/mmdc",
    "/opt/homebrew/bin/mmdc",
    "~/.npm-global/bin/mmdc",
    "/usr/bin/mmdc",
    path.join(os.homedir(), ".npm-global/bin/mmdc"),
    // Add NVM paths
    path.join(os.homedir(), ".nvm/versions/node/*/bin/mmdc"),
    // Add Homebrew paths
    "/opt/homebrew/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/.bin/mmdc",
    "/usr/local/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/.bin/mmdc",
  ];

  // Check specific locations
  for (const p of possiblePaths) {
    if (p.includes("*")) {
      // Handle glob patterns (for NVM paths)
      try {
        const { stdout } = await execPromise(`ls -d ${p} 2>/dev/null || echo ""`);
        const paths = stdout.trim().split("\n").filter(Boolean);

        for (const foundPath of paths) {
          if (fs.existsSync(foundPath)) {
            console.log("Found mmdc at NVM location:", foundPath);
            await showToast({
              style: Toast.Style.Success,
              title: "Found mermaid-cli",
              message: `Located at ${foundPath}`,
            });
            return foundPath;
          }
        }
      } catch (error) {
        console.error("Error checking glob pattern:", p, error);
      }
    } else {
      const expandedPath = p.startsWith("~/") ? p.replace("~/", `${os.homedir()}/`) : p;
      if (fs.existsSync(expandedPath)) {
        console.log("Found mmdc at specific location:", expandedPath);
        await showToast({
          style: Toast.Style.Success,
          title: "Found mermaid-cli",
          message: `Located at ${expandedPath}`,
        });
        return expandedPath;
      }
    }
  }

  // Try to find any mmdc in the user's home directory as a last resort
  try {
    const { stdout } = await execPromise(`find ${os.homedir()} -name mmdc -type f -perm -u+x 2>/dev/null || echo ""`);
    const paths = stdout.trim().split("\n").filter(Boolean);

    if (paths.length > 0) {
      console.log("Found mmdc in home directory:", paths[0]);
      await showToast({
        style: Toast.Style.Success,
        title: "Found mermaid-cli",
        message: `Located at ${paths[0]}`,
      });
      return paths[0];
    }
  } catch (error) {
    console.error("Error searching home directory for mmdc:", error);
  }

  console.error("mmdc not found in any of the expected locations");

  // Show a more helpful error message
  await showFailureToast({
    title: "mermaid-cli not found",
    message: "Please install with 'npm install -g @mermaid-js/mermaid-cli' or set a custom path in preferences",
  });

  throw new Error(
    "mermaid-cli (mmdc) command not found. Please install it with 'npm install -g @mermaid-js/mermaid-cli' or specify the path in extension preferences",
  );
}

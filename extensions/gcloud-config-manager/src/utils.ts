import { execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";

let gcloudPath: string | null = null;

export function getGCloudPath(): string {
  if (gcloudPath) {
    return gcloudPath;
  }

  // Try to find gcloud using which command with extended PATH
  try {
    const extendedPath = [
      process.env.PATH || "",
      `${homedir()}/google-cloud-sdk/bin`,
      "/usr/local/bin",
      "/opt/homebrew/bin",
    ].join(":");

    const result = execSync("which gcloud", {
      encoding: "utf-8",
      shell: "/bin/bash",
      env: { ...process.env, PATH: extendedPath },
    }).trim();

    if (result && existsSync(result)) {
      gcloudPath = result;
      return result;
    }
  } catch (error) {
    // Ignore error and fall through
  }

  // Fallback: check common installation locations
  const possiblePaths = [
    `${homedir()}/google-cloud-sdk/bin/gcloud`,
    "/usr/local/bin/gcloud",
    "/opt/homebrew/bin/gcloud",
    "/usr/bin/gcloud",
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      gcloudPath = path;
      return path;
    }
  }

  // Default to just "gcloud" and hope it's in PATH
  gcloudPath = "gcloud";
  return gcloudPath;
}

export function runGCloudCommand(command: string): string {
  // Build PATH with all common gcloud installation locations
  const pathDirs = [
    `${homedir()}/google-cloud-sdk/bin`,
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    process.env.PATH || "",
  ];
  
  // Need to run through shell with proper PATH and shell utilities
  return execSync(command, {
    encoding: "utf-8",
    shell: "/bin/bash",
    env: {
      ...process.env,
      PATH: pathDirs.filter(Boolean).join(":"),
    },
  });
}

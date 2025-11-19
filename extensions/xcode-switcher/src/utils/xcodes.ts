import { execSync, spawnSync } from "child_process";
import { existsSync } from "fs";
import { executeWithSudo } from "./auth";

export interface XcodeVersion {
  number: string;
  version: string;
  build: string;
  isSelected?: boolean;
  isInstalled?: boolean;
  path?: string;
}

export interface Runtime {
  name: string;
  identifier: string;
  platform: string;
  version: string;
}

export function findXcodesPath(): string | null {
  console.log("[XCODES] Searching for xcodes binary");
  const possiblePaths = [
    "/opt/homebrew/bin/xcodes",
    "/usr/local/bin/xcodes",
    `${process.env.HOME}/.local/bin/xcodes`,
  ];

  for (const path of possiblePaths) {
    console.log(`[XCODES] Checking path: ${path}`);
    if (existsSync(path)) {
      console.log(`[XCODES] Found xcodes at: ${path}`);
      return path;
    }
  }

  console.log("[XCODES] xcodes binary not found");
  return null;
}

function execXcodes(
  command: string,
  args: string[],
  xcodesPath: string,
): string {
  console.log(`[XCODES] Executing: ${xcodesPath} ${command} ${args.join(" ")}`);
  try {
    const result = execSync(`${xcodesPath} ${command} ${args.join(" ")}`, {
      encoding: "utf-8",
      timeout: 60000,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
      },
    });
    console.log(`[XCODES] Command successful, output length: ${result.length}`);
    console.log(`[XCODES] Output preview: ${result.substring(0, 200)}`);
    return result;
  } catch (err: any) {
    console.error(`[XCODES] Command failed with error: ${err.message}`);
    if (err.stdout) {
      console.log(`[XCODES] stdout available: ${err.stdout.substring(0, 200)}`);
    }
    if (err.stderr) {
      console.error(`[XCODES] stderr: ${err.stderr.substring(0, 200)}`);
    }
    // Many xcodes commands return errors but have valid stdout
    if (err.stdout) {
      return err.stdout;
    }
    throw err;
  }
}

export function parseSelectOutput(output: string): XcodeVersion[] {
  const lines = output.split("\n").filter((line) => line.trim());
  const versions: XcodeVersion[] = [];

  lines.forEach((line) => {
    const match = line.match(
      /(\d+)\)\s+([\d.]+)\s+\(([^)]+)\)(\s+\(Selected\))?/,
    );
    if (match) {
      versions.push({
        number: match[1],
        version: match[2],
        build: match[3],
        isSelected: !!match[4],
      });
    }
  });

  return versions;
}

export function parseInstalledOutput(output: string): XcodeVersion[] {
  const lines = output.split("\n").filter((line) => line.trim());
  const versions: XcodeVersion[] = [];

  lines.forEach((line) => {
    // Parse: 16.4 (16F6) (Selected)    /Applications/Xcode-16.4.0.app
    // Or: 26.0.1 (17A400)    /Applications/Xcode-26.0.1.app
    // Format: version (build) [optional (Selected)]    path
    const match = line.match(
      /([\d.]+)\s+\(([^)]+)\)(?:\s+\(Selected\))?\s+(.+)/,
    );
    if (match) {
      versions.push({
        number: "",
        version: match[1],
        build: match[2],
        path: match[3].trim(),
        isInstalled: true,
      });
    }
  });

  return versions;
}

export function parseListOutput(output: string): XcodeVersion[] {
  const lines = output.split("\n").filter((line) => line.trim());
  const versions: XcodeVersion[] = [];

  lines.forEach((line) => {
    // Parse: 16.4 (16F6) ou 16.4 (16F6) (Installed)
    const match = line.match(/([\d.]+)\s+\(([^)]+)\)(\s+\(Installed\))?/);
    if (match) {
      versions.push({
        number: "",
        version: match[1],
        build: match[2],
        isInstalled: !!match[3],
      });
    }
  });

  return versions;
}

export function listInstalled(xcodesPath: string): XcodeVersion[] {
  const output = execXcodes("installed", [], xcodesPath);
  return parseInstalledOutput(output);
}

export function listAvailable(xcodesPath: string): XcodeVersion[] {
  const output = execXcodes("list", [], xcodesPath);
  return parseListOutput(output);
}

export async function selectVersion(
  xcodesPath: string,
  number: string,
  password?: string,
): Promise<void> {
  console.log(`[XCODES] selectVersion called with number: ${number}`);
  console.log(`[XCODES] Password ${password ? "provided" : "not provided"}`);

  // Validate number input to prevent command injection
  if (!/^\d+$/.test(number)) {
    throw new Error("Invalid version number");
  }

  if (!password) {
    throw new Error("Password required for selecting Xcode version");
  }

  try {
    // Step 1: Get the list of installed Xcode versions with their paths
    console.log("[XCODES] Getting list of installed Xcodes");
    const listResult = spawnSync(xcodesPath, ["select"], {
      input: "", // No input, just get the list
      encoding: "utf-8",
      timeout: 10000,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH}`,
      },
    });

    const listOutput = listResult.stdout || "";
    console.log("[XCODES] List output:", listOutput);

    // Parse the output to find the selected version's path
    // Format: "1) 16.4 (16F6) (Selected)"
    //         "2) 26.0.1 (17A400)"
    const lines = listOutput.split("\n");
    let selectedVersion = "";

    for (const line of lines) {
      const match = line.match(
        new RegExp(`^${number}\\)\\s+([\\d.]+)\\s+\\(([^)]+)\\)`),
      );
      if (match) {
        selectedVersion = match[1];
        console.log(
          `[XCODES] Found version ${selectedVersion} for number ${number}`,
        );
        break;
      }
    }

    if (!selectedVersion) {
      throw new Error(`Could not find Xcode version for number ${number}`);
    }

    // Step 2: Get the installed Xcodes to find the path
    const installed = listInstalled(xcodesPath);
    const targetXcode = installed.find((x) => x.version === selectedVersion);

    if (!targetXcode || !targetXcode.path) {
      throw new Error(
        `Could not find installation path for Xcode ${selectedVersion}`,
      );
    }

    console.log(`[XCODES] Target Xcode path: ${targetXcode.path}`);

    // Step 3: Run sudo xcode-select -s directly with our secure sudo wrapper
    console.log("[XCODES] Running xcode-select with sudo");
    const result = await executeWithSudo(
      "/usr/bin/xcode-select",
      ["-s", targetXcode.path],
      password,
    );

    console.log("[XCODES] xcode-select completed successfully");
    console.log("[XCODES] Output:", result);
  } catch (error: any) {
    console.error("[XCODES] selectVersion failed:", error.message);
    throw error;
  }
}

function validateVersion(version: string): void {
  // Validate version format: should be digits and dots only (e.g., "16.4", "15.3")
  if (!/^[\d.]+$/.test(version)) {
    throw new Error("Invalid version format");
  }
}

export function downloadXcode(xcodesPath: string, version: string): void {
  validateVersion(version);
  execXcodes("download", [version], xcodesPath);
}

export function installXcode(xcodesPath: string, version: string): void {
  validateVersion(version);
  execXcodes("install", [version], xcodesPath);
}

export function uninstallXcode(xcodesPath: string, version: string): void {
  validateVersion(version);
  execXcodes("uninstall", [version], xcodesPath);
}

export function updateList(xcodesPath: string): void {
  execXcodes("update", [], xcodesPath);
}

export function listRuntimes(_xcodesPath: string): Runtime[] {
  // TODO: Parse runtimes output
  // const output = execXcodes("runtimes", xcodesPath);
  return [];
}

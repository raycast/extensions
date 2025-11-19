import { execSync } from "child_process";
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

function execXcodes(args: string, xcodesPath: string): string {
  console.log(`[XCODES] Executing: ${xcodesPath} ${args}`);
  try {
    const result = execSync(`${xcodesPath} ${args}`, {
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
    // Muitos comandos do xcodes retornam erro mas têm stdout válido
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
    // Parse: 16.4 (16F6) (/Applications/Xcode-16.4.0.app)
    const match = line.match(/([\d.]+)\s+\(([^)]+)\)\s+\(([^)]+)\)/);
    if (match) {
      versions.push({
        number: "",
        version: match[1],
        build: match[2],
        path: match[3],
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
  const output = execXcodes("installed", xcodesPath);
  return parseInstalledOutput(output);
}

export function listAvailable(xcodesPath: string): XcodeVersion[] {
  const output = execXcodes("list", xcodesPath);
  return parseListOutput(output);
}

export async function selectVersion(
  xcodesPath: string,
  number: string,
  password?: string,
): Promise<void> {
  console.log(`[XCODES] selectVersion called with number: ${number}`);
  console.log(`[XCODES] Password ${password ? "provided" : "not provided"}`);

  try {
    // Primeiro, tenta sem sudo para ver se funciona
    console.log("[XCODES] Attempting select without sudo first");
    const simpleCommand = `echo "${number}" | ${xcodesPath} select`;

    try {
      const result = execSync(simpleCommand, {
        encoding: "utf-8",
        shell: "/bin/bash",
        timeout: 10000,
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
        },
      });
      console.log("[XCODES] Select succeeded without sudo!");
      console.log(`[XCODES] Output: ${result}`);
      return;
    } catch (normalError: any) {
      console.log("[XCODES] Select without sudo failed, trying with sudo");
      console.error(`[XCODES] Normal error: ${normalError.message}`);
      if (normalError.stderr) {
        console.error(`[XCODES] stderr: ${normalError.stderr}`);
      }
      if (normalError.stdout) {
        console.log(`[XCODES] stdout: ${normalError.stdout}`);
      }
    }

    // Se falhou sem sudo, tenta com sudo
    console.log("[XCODES] Executing select with sudo");
    const sudoCommand = `sh -c 'echo "${number}" | ${xcodesPath} select'`;
    const result = await executeWithSudo(sudoCommand, password);

    console.log("[XCODES] Select with sudo completed");
    console.log(`[XCODES] Result: ${result}`);
  } catch (error: any) {
    console.error("[XCODES] selectVersion failed:", error.message);
    throw error;
  }
}

export function downloadXcode(xcodesPath: string, version: string): void {
  execXcodes(`download ${version}`, xcodesPath);
}

export function installXcode(xcodesPath: string, version: string): void {
  execXcodes(`install ${version}`, xcodesPath);
}

export function uninstallXcode(xcodesPath: string, version: string): void {
  execXcodes(`uninstall ${version}`, xcodesPath);
}

export function updateList(xcodesPath: string): void {
  execXcodes("update", xcodesPath);
}

export function listRuntimes(_xcodesPath: string): Runtime[] {
  // TODO: Parse runtimes output
  // const output = execXcodes("runtimes", xcodesPath);
  return [];
}

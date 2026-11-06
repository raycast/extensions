import { accessSync, constants, existsSync, readdirSync, readFileSync } from "fs";
import { basename, isAbsolute, join, resolve } from "path";

import { getPreferenceValues } from "@raycast/api";

import { createExternalScriptAdapter } from "../adapters/external-script-adapter";
import type { ExternalAdapterManifest, ExternalAdapterManifestFile, PasswordManagerAdapter } from "../types";
import { expandHomePath } from "../utils/paths";

const MANIFEST_FILE_NAME = "pwm-adapter.json";

function isExecutable(filePath: string): boolean {
  if (process.platform === "win32") {
    const lowerPath = filePath.toLowerCase();
    return (
      lowerPath.endsWith(".exe") ||
      lowerPath.endsWith(".bat") ||
      lowerPath.endsWith(".cmd") ||
      lowerPath.endsWith(".ps1")
    );
  }

  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveExternalCommand(
  workingDirectory: string,
  command: string,
): Pick<ExternalAdapterManifest, "executable" | "args" | "workingDirectory"> {
  const resolvedCommand = isAbsolute(command) ? command : resolve(workingDirectory, command);

  if (!existsSync(resolvedCommand)) {
    throw new Error(`Command not found: ${resolvedCommand}`);
  }

  // Always invoke .js/.mjs via the host Node binary — Raycast's child process PATH
  // often lacks `node`, so shebangs like `#!/usr/bin/env node` fail when the script
  // is executed directly (e.g. after chmod +x).
  if (resolvedCommand.endsWith(".js") || resolvedCommand.endsWith(".mjs")) {
    return {
      workingDirectory,
      executable: process.execPath,
      args: [resolvedCommand],
    };
  }

  if (isExecutable(resolvedCommand)) {
    return {
      workingDirectory,
      executable: resolvedCommand,
      args: [],
    };
  }

  throw new Error(`Command is not executable: ${resolvedCommand}`);
}

function parseManifestFile(contents: string, directoryPath: string): ExternalAdapterManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents) as unknown;
  } catch {
    throw new Error(`Invalid JSON in ${join(directoryPath, MANIFEST_FILE_NAME)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Manifest must be a JSON object in ${directoryPath}`);
  }

  const manifest = parsed as ExternalAdapterManifestFile;

  if (!manifest.id?.trim()) {
    throw new Error(`Manifest in ${directoryPath} is missing id`);
  }

  if (!manifest.name?.trim()) {
    throw new Error(`Manifest in ${directoryPath} is missing name`);
  }

  if (!manifest.command?.trim()) {
    throw new Error(`Manifest in ${directoryPath} is missing command`);
  }

  if (manifest.capabilities !== undefined && !Array.isArray(manifest.capabilities)) {
    throw new Error(`Manifest capabilities in ${directoryPath} must be an array`);
  }

  if (manifest.env !== undefined && (typeof manifest.env !== "object" || manifest.env === null)) {
    throw new Error(`Manifest env in ${directoryPath} must be an object`);
  }

  let mode: ExternalAdapterManifest["mode"] = undefined;
  const rawMode = (parsed as { mode?: unknown }).mode;
  if (rawMode === "persistent" || rawMode === "one-shot") {
    mode = rawMode;
  } else if (rawMode !== undefined) {
    console.warn(`Unknown adapter mode "${String(rawMode)}" in ${directoryPath}; using one-shot`);
  }

  const command = resolveExternalCommand(directoryPath, manifest.command);

  return {
    id: manifest.id.trim(),
    name: manifest.name.trim(),
    command: manifest.command.trim(),
    capabilities: manifest.capabilities,
    env: manifest.env,
    mode,
    workingDirectory: command.workingDirectory,
    executable: command.executable,
    args: command.args,
  };
}

function loadExternalAdapterFromDirectory(directoryPath: string): PasswordManagerAdapter {
  const manifestPath = join(directoryPath, MANIFEST_FILE_NAME);

  if (!existsSync(manifestPath)) {
    throw new Error(`Missing ${MANIFEST_FILE_NAME}`);
  }

  const contents = readFileSync(manifestPath, "utf8");
  const manifest = parseManifestFile(contents, directoryPath);
  return createExternalScriptAdapter(manifest);
}

function getExternalAdaptersDirectory(): string | undefined {
  const preferences = getPreferenceValues<{ externalAdaptersDirectory?: string }>();
  const expanded = expandHomePath(preferences.externalAdaptersDirectory ?? "");
  return expanded || undefined;
}

export async function loadExternalAdapters(): Promise<PasswordManagerAdapter[]> {
  const directory = getExternalAdaptersDirectory();
  if (!directory) {
    return [];
  }

  if (!existsSync(directory)) {
    console.warn(`External adapters directory not found: ${directory}`);
    return [];
  }

  let entries: string[];
  try {
    entries = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    console.warn(
      `Failed to read external adapters directory (${directory}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }

  const adapters: PasswordManagerAdapter[] = [];
  const seenIds = new Set<string>();

  for (const entryName of entries) {
    const adapterDirectory = join(directory, entryName);

    try {
      const adapter = loadExternalAdapterFromDirectory(adapterDirectory);
      if (seenIds.has(adapter.id)) {
        console.warn(
          `Skipping duplicate external adapter id "${adapter.id}" in ${adapterDirectory}. Each adapter id must be unique.`,
        );
        continue;
      }

      seenIds.add(adapter.id);
      adapters.push(adapter);
    } catch (error) {
      console.warn(
        `Skipping external adapter in ${adapterDirectory}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return adapters;
}

export function getExternalAdaptersDirectoryForDisplay(): string | undefined {
  return getExternalAdaptersDirectory();
}

export function getManifestFileName(): string {
  return MANIFEST_FILE_NAME;
}

export function getAdapterDirectoryName(directoryPath: string): string {
  return basename(directoryPath);
}

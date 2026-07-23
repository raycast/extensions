import { getPreferenceValues } from "@raycast/api";
import { execa } from "execa";
import type { MiseInstalledTools, MiseRemoteVersion } from "./types";

function getMisePath(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.misePath || "/opt/homebrew/bin/mise";
}

async function runMise(args: string[]): Promise<string> {
  const misePath = getMisePath();
  const result = await execa(misePath, args, { env: { ...process.env } });
  return result.stdout;
}

export async function getInstalledTools(): Promise<MiseInstalledTools> {
  const stdout = await runMise(["ls", "--json"]);
  return JSON.parse(stdout) as MiseInstalledTools;
}

export async function getRemoteVersions(
  plugin: string,
): Promise<MiseRemoteVersion[]> {
  const stdout = await runMise(["ls-remote", plugin, "--json"]);
  return JSON.parse(stdout) as MiseRemoteVersion[];
}

export async function getLatestVersion(plugin: string): Promise<string> {
  const stdout = await runMise(["latest", plugin]);
  return stdout.trim();
}

export async function getPlugins(): Promise<string[]> {
  const [allOutput, coreOutput] = await Promise.all([
    runMise(["plugins", "ls", "--all"]),
    runMise(["plugins", "ls", "--core"]),
  ]);

  const all = new Set<string>();
  for (const line of allOutput.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) all.add(trimmed);
  }
  for (const line of coreOutput.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) all.add(trimmed);
  }

  return Array.from(all).sort();
}

export async function installVersion(
  plugin: string,
  version: string,
): Promise<void> {
  await runMise(["install", `${plugin}@${version}`]);
}

export async function useGlobal(
  plugin: string,
  version: string,
): Promise<void> {
  await runMise(["use", "--global", `${plugin}@${version}`]);
}

export async function uninstallVersion(
  plugin: string,
  version: string,
): Promise<void> {
  await runMise(["uninstall", `${plugin}@${version}`]);
}

export async function deactivateGlobally(plugin: string): Promise<void> {
  await runMise(["use", "--global", "--remove", plugin]);
}

export function extractErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "stderr" in e) {
    const stderr = String((e as { stderr: unknown }).stderr);
    if (stderr) return stderr;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

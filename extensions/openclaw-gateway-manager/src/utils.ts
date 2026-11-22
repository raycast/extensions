import { delimiter } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import {
  commandEnvironment,
  resolveBinary,
  runExecutable,
  searchPaths,
} from "./runtime";
import { normalizeSettings, settingsEnvironment } from "./settings";
import type { OpenClawSettings, SettingsInput } from "./settings";

export function getSettings(): OpenClawSettings {
  return normalizeSettings(getPreferenceValues<SettingsInput>());
}

export function getBin(settings = getSettings()): string {
  return resolveBinary(settings.binPath, [
    ...settings.additionalPaths,
    ...searchPaths(),
  ]);
}

export function getEnv(
  binary = getBin(),
  settings = getSettings(),
): NodeJS.ProcessEnv {
  const env = commandEnvironment(binary, settingsEnvironment(settings));
  env.PATH = [
    ...new Set([
      ...settings.additionalPaths,
      ...(env.PATH ?? "").split(delimiter),
    ]),
  ]
    .filter(Boolean)
    .join(delimiter);
  return env;
}

export function runCli(
  args: string[],
  settings = getSettings(),
): Promise<string> {
  const binary = getBin(settings);
  return runExecutable(
    binary,
    args,
    getEnv(binary, settings),
    settings.commandTimeoutMs,
    settings.commandOutputBytes,
  );
}

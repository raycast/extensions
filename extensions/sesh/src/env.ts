import { getPreferenceValues } from "@raycast/api";

export function getEnv() {
  const { environmentPath } = getPreferenceValues<Preferences.CmdConnect>();

  const patchedWithoutDuplicates = new Set([
    ...(process.env.PATH?.split(":") ?? []),
    ...(environmentPath?.split(":") ?? []),
  ]);

  const pathString = Array.from(patchedWithoutDuplicates).join(":");

  const env = Object.assign({}, process.env, {
    PATH: pathString,
  });

  return env;
}

import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  environmentPath: string;
}

export function getEnv() {
  const { environmentPath } = getPreferenceValues<Preferences>();

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

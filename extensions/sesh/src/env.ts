import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  searchPath: string;
}

export function getEnv() {
  const { searchPath } = getPreferenceValues<Preferences>();

  const env = Object.assign({}, process.env, {
    PATH: searchPath,
  });

  return env;
}

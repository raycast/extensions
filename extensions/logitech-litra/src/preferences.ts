import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  // DEPRECATED: We now use [litra-rs](https://github.com/timrogers/litra-rs), not the old version implemented in Node
  cliDirectory: string;
  // DEPRECATED: We now use [litra-rs](https://github.com/timrogers/litra-rs), not the old version implemented in Node
  nodeBinaryPath: string;
  litraBinaryPath: string;
}

// DEPRECATED: We now use [litra-rs](https://github.com/timrogers/litra-rs), not the old version implemented in Node
export const getCliDirectory = (): string => {
  const { cliDirectory } = getPreferenceValues<Preferences>();
  return cliDirectory;
};

// DEPRECATED: We now use [litra-rs](https://github.com/timrogers/litra-rs), not the old version implemented in Node
export const getNodeBinaryPath = (): string => {
  const { nodeBinaryPath } = getPreferenceValues<Preferences>();
  return nodeBinaryPath;
};

export const getLitraBinaryPath = (): string => {
  const { litraBinaryPath } = getPreferenceValues<Preferences>();
  return litraBinaryPath;
};

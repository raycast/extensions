import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  cliDirectory: string;
  nodeBinaryPath: string;
}

export const getCliDirectory = (): string => {
  const { cliDirectory } = getPreferenceValues<Preferences>();
  return cliDirectory;
};

export const getNodeBinaryPath = (): string => {
  const { nodeBinaryPath } = getPreferenceValues<Preferences>();
  return nodeBinaryPath;
};

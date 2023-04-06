import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  cliDirectory: string;
}

export const getCliDirectory = (): string => {
  const { cliDirectory } = getPreferenceValues<Preferences>();
  return cliDirectory;
};

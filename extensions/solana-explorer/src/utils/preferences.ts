import { getPreferenceValues } from "@raycast/api";
import { SolanaExplorer } from "./explorerResolver";

interface ExtensionPreferences {
  explorer: SolanaExplorer;
  maxStorage: number;
}

/**
 * Returns preferences object
 */
export function preferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

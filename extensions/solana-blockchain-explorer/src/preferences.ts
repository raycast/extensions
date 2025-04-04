import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  defaultExplorer: "Solana Explorer" | "Solscan" | "SolanaFM" | "Orb";
}

export const preferences = getPreferenceValues<Preferences>();

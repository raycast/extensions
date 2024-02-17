import { webln } from "@getalby/sdk";
import { getPreferenceValues } from "@raycast/api";
import "websocket-polyfill";
import * as crypto from "crypto";
globalThis.crypto = crypto as any;

interface Preferences {
  nwcurl: string;
}

// Function to connect the wallet using the NWC URL components
export const connectWallet = async () => {
  const preferences = getPreferenceValues<Preferences>();
  const nwcUrl = preferences.nwcurl;

  const nwc = new webln.NostrWebLNProvider({
    nostrWalletConnectUrl: nwcUrl,
  });

  try {
    await nwc.enable(); // Establish the connection with the wallet
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    throw error;
  }

  return nwc; // Return the connected wallet instance for further operations
};

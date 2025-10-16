import { webln } from "@getalby/sdk";
import { getPreferenceValues } from "@raycast/api";
import "websocket-polyfill";
import * as crypto from "crypto";
// eslint-disable-next-line
globalThis.crypto = crypto as any;

// Function to connect the wallet using the NWC URL components
export const connectWallet = async () => {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const nwcUrl = preferences.nwcurl;

    const nwc = new webln.NostrWebLNProvider({
      nostrWalletConnectUrl: nwcUrl,
    });

    await nwc.enable(); // Establish the connection with the wallet
    return nwc; // Return the connected wallet instance for further operations
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    throw error;
  }
};

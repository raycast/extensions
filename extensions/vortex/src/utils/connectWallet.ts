import { LocalStorage, showToast, ToastStyle } from "@raycast/api";
import { webln } from "@getalby/sdk";

async function connectWalletWithStoredComponents() {
  const relayUrl = await LocalStorage.getItem<string>("relayUrl");
  const secret = await LocalStorage.getItem<string>("secret");
  const walletPubkey = await LocalStorage.getItem<string>("walletPubkey");

  if (!relayUrl || !secret || !walletPubkey) {
    showToast({ style: ToastStyle.Failure, title: "NWC URL components not found" });
    return;
  }

  const nwc = new webln.NostrWebLNProvider({
    nostrWalletConnectUrl: `nostr+walletconnect://${walletPubkey}?relay=${relayUrl}&secret=${secret}`,
  });

  try {
    await nwc.enable();
    showToast({ style: ToastStyle.Success, title: "Wallet connected successfully" });
  } catch (error) {
    showToast({ style: ToastStyle.Failure, title: "Failed to connect the wallet", message: String(error) });
  }
}

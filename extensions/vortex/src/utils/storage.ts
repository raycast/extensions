import { LocalStorage, showToast, ToastStyle } from "@raycast/api";

async function storeNWCURLComponents(nwcUrl: string) {
  const url = new URL(nwcUrl);
  const relayUrl = url.searchParams.get("relay");
  const secret = url.searchParams.get("secret");
  const walletPubkey = url.pathname.slice(1);

  if (!relayUrl || !secret || !walletPubkey) {
    showToast({ style: ToastStyle.Failure, title: "Invalid NWC URL" });
    return;
  }

  await LocalStorage.setItem("relayUrl", relayUrl);
  await LocalStorage.setItem("secret", secret);
  await LocalStorage.setItem("walletPubkey", walletPubkey);

  showToast({ style: ToastStyle.Success, title: "NWC URL components stored successfully" });
}

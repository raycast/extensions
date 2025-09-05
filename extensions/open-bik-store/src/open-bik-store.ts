import { showToast, Toast, open } from "@raycast/api";

// Usage: raycast - pass storeId directly as argument
export default async function main(args: { arguments: { storeId: string } }) {
  const storeId = args.arguments.storeId;
  if (!storeId) {
    await showToast({ style: Toast.Style.Failure, title: "Missing storeId", message: "Please provide a storeId" });
    return;
  }
  const encodedStoreId = encodeURIComponent(storeId);
  const url = `https://console.firebase.google.com/project/bikayi-chat/firestore/databases/-default-/data/~2Fbik-store~2F${encodedStoreId}?view=panel-view&scopeType=collection&scopeName=%2Fstore-new`;
  await open(url, "google chrome");
  await showToast({ style: Toast.Style.Success, title: "Opened in Chrome" });
}

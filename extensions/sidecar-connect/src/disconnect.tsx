import { showHUD, showToast, Toast } from "@raycast/api";
import { disconnectAll } from "./lib/swift-bridge";

export default async function Disconnect() {
  try {
    const result = await disconnectAll();
    await showHUD(result as string);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Disconnect failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

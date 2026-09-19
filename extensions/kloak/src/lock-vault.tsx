import { showToast, Toast } from "@raycast/api";
import { requestDaemon } from "./kloak-ipc.js";

export default async function LockVaultCommand() {
  try {
    await requestDaemon("vault.lock");
    await showToast({
      style: Toast.Style.Success,
      title: "🔒 Vault Locked",
      message: "Keys and secrets zeroed from memory"
    });
  } catch (err: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Lock Failed",
      message: err.message
    });
  }
}

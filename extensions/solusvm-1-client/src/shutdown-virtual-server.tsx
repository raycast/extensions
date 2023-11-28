import { Toast, showToast } from "@raycast/api";
import { shutdownVirtualServer } from "./api";

export default async function ShutdownVirtualServer() {
  const response = await shutdownVirtualServer();
  if (response.status === "success") {
    await showToast(Toast.Style.Success, "SUCCESS", "Shut Down");
  }
}

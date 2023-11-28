import { Toast, showToast } from "@raycast/api";
import { rebootVirtualServer } from "./api";

export default async function RebootVirtualServer() {
  const response = await rebootVirtualServer();
  if (response.status === "success") {
    await showToast(Toast.Style.Success, "SUCCESS", "Rebooted");
  }
}

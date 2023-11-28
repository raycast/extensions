import { Toast, showToast } from "@raycast/api";
import { bootVirtualServer } from "./api";

export default async function BootVirtualServer() {
  const response = await bootVirtualServer();
  if (response.status === "success") {
    await showToast(Toast.Style.Success, "SUCCESS", "Booted");
  }
}

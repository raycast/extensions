import { environment, showToast, ToastStyle } from "@raycast/api";
import degit from "degit";

export async function fetchPages(): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Fetching TLDR Pages...");
  await degit("tldr-pages/tldr/pages").clone(environment.supportPath);
  toast.hide();
  await showToast(ToastStyle.Success, "TLDR pages fetched!")
}

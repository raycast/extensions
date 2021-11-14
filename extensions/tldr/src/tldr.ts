import { environment, showToast, ToastStyle } from "@raycast/api";
import degit from "degit";
import { rm } from "fs/promises";
import { resolve } from "path";

export const CACHE_DIR = resolve(environment.supportPath, "pages")

export async function refreshPages(): Promise<void> {
  await rm(resolve(CACHE_DIR), {recursive: true, force: true})
  await showToast(ToastStyle.Animated, "Fetching TLDR Pages...");
  try {
    await degit("tldr-pages/tldr/pages").clone(CACHE_DIR);
    await showToast(ToastStyle.Success, "TLDR pages fetched!")
  } catch (error) {
    await showToast(ToastStyle.Failure, "Download Failed!", "Please check your internet connexion.")
  }
}

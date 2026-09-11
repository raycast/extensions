import { showToast, Toast, Clipboard, showHUD } from "@raycast/api";
import { createRandomAlias, SimpleLoginError } from "./api";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating alias...",
  });

  try {
    const alias = await createRandomAlias({ note: "Created with raycast" });

    await Clipboard.copy(alias.email);

    await toast.hide();
    await showHUD(`Copied ${alias.email}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create alias";
    toast.message = error instanceof SimpleLoginError ? error.message : "Unknown error";
  }
}

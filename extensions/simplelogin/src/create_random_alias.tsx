import { createRandomAlias } from "./api/simplelogin_api";
import { showHUD, Clipboard, showToast, Toast, popToRoot } from "@raycast/api";

export default async function Command() {
  await showToast({
    style: Toast.Style.Animated,
    title: "Generating random alias...",
  });
  const alias = await createRandomAlias();
  if (alias == null) {
    showHUD("Failed to create random alias");
    return;
  }
  console.log(alias.email);
  showHUD("Random alias created and copied to clipboard");
  Clipboard.copy(alias.email);
}

import { showHUD } from "@raycast/api";
import { appSwitcher } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => appSwitcher(conn));
    await showHUD("🗂 App Switcher");
  } catch (error) {
    await showErrorToast(error);
  }
}

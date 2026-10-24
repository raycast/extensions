import { showHUD } from "@raycast/api";
import { longPressSelect } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => longPressSelect(conn));
    await showHUD("📋 Context Menu");
  } catch (error) {
    await showErrorToast(error);
  }
}

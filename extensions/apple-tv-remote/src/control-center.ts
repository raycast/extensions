import { showHUD } from "@raycast/api";
import { controlCenter } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => controlCenter(conn));
    await showHUD("🎛 Control Center");
  } catch (error) {
    await showErrorToast(error);
  }
}

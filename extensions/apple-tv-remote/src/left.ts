import { showHUD } from "@raycast/api";
import { RemoteKey, sendKey } from "@bharper/atv-js";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => sendKey(conn, RemoteKey.Left));
    await showHUD("⬅️ Left");
  } catch (error) {
    await showErrorToast(error);
  }
}

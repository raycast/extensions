import { showHUD } from "@raycast/api";
import { RemoteKey, sendKey } from "@bharper/atv-js";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function PlayPause(): Promise<void> {
  try {
    await withConnection(async (conn) => {
      await sendKey(conn, RemoteKey.PlayPause);
    });
    await showHUD("⏯ Play/Pause");
  } catch (error) {
    await showErrorToast(error);
  }
}

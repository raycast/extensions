import { showHUD } from "@raycast/api";
import { RemoteKey, sendKey } from "@bharper/atv-js";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Home(): Promise<void> {
  try {
    await withConnection(async (conn) => {
      await sendKey(conn, RemoteKey.Home);
    });
    await showHUD("🏠 Home");
  } catch (error) {
    await showErrorToast(error);
  }
}

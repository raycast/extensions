import { showHUD } from "@raycast/api";
import { disconnectAll } from "./lib/swift-bridge";

export default async function Disconnect() {
  try {
    const result = await disconnectAll();
    await showHUD(result as string);
  } catch (err) {
    await showHUD(`Disconnect failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

import { showHUD } from "@raycast/api";
import { toggleProxy } from "./proxy";

export default async function Command() {
  try {
    const result = await toggleProxy();
    await showHUD(result.running ? "SSH Proxy Router active" : "SSH Proxy Router stopped");
    console.log(result.message);
  } catch (error) {
    await showHUD(`SSH Proxy Router failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

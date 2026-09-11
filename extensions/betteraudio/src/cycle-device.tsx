import { showHUD } from "@raycast/api";
import { cycleDevice } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    const msg = await cycleDevice("output");
    await showHUD(`🔄 ${msg}`);
  } catch (error) {
    await handleCLIError(error);
  }
}

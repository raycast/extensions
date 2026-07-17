import { showToast, Toast } from "@raycast/api";
import { startCaffeinate, stopCaffeinate, isCaffeinateRunning } from "./utils";

export default async function Command() {
  try {
    const running = await isCaffeinateRunning();
    if (running) {
      await stopCaffeinate({ status: true }, "Your PC is now decaffeinated");
    } else {
      await startCaffeinate({ status: true }, "Your PC is now caffeinated");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to toggle caffeination", String(error));
  }
}

import { LocalStorage, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  const pid = await LocalStorage.getItem<number>("pid");

  try {
    if (!pid) {
      await showHUD("No active shutdown sequence.");
      await LocalStorage.removeItem("timerEnd");
      return;
    } else {
      process.kill(pid);
      await showHUD(`Killed process ${pid}`);
      await LocalStorage.removeItem("pid");
      await LocalStorage.removeItem("timerEnd");
      return;
    }
  } catch (err) {
    console.error(err);
    await showFailureToast(err, { title: "Failed to stop shutdown timer" });
    await LocalStorage.removeItem("pid");
    await LocalStorage.removeItem("timerEnd");
  }
}

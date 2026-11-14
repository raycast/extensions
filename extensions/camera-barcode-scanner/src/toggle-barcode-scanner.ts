import { LocalStorage, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { checkScanner, findScanner, startScanner, stopScanner } from "swift:../swift";
import { PID_KEY, buildOptions, errorMessage } from "./scanner";

export default async function Command() {
  try {
    const stored = await LocalStorage.getItem<number>(PID_KEY);
    const running = await findScanner(stored ?? 0);
    if (running) {
      await closeMainWindow();
      if (await stopScanner(running)) {
        await LocalStorage.removeItem(PID_KEY);
        await showHUD("Barcode scanner off");
      } else {
        await LocalStorage.setItem(PID_KEY, running);
        await showHUD("Could not stop the barcode scanner. Try again.");
      }
      return;
    }
    if (stored !== undefined) await LocalStorage.removeItem(PID_KEY);

    const options = buildOptions();
    await checkScanner(options, false);
    await closeMainWindow();
    try {
      const pid = await startScanner(options);
      await LocalStorage.setItem(PID_KEY, pid);
      await showHUD("Barcode scanner on");
    } catch (error) {
      await showHUD(errorMessage(error));
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not start the barcode scanner" });
  }
}

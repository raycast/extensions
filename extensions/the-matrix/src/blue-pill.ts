import {
  PopToRootType,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { isOverlayRunning, startOverlay } from "./overlay";
import { getBluePillQuote } from "./quotes";

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const alreadyRunning = await isOverlayRunning();

    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    const startPromise = alreadyRunning
      ? undefined
      : startOverlay({
          soundsOn: preferences.soundsOn,
        });

    await showToast({
      style: Toast.Style.Success,
      title: getBluePillQuote(alreadyRunning),
    });

    await startPromise;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "failed to enter the matrix ⛓️‍💥",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

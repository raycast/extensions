import {
  PopToRootType,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { isOverlayRunning, startOverlay, type MatrixDensity } from "./overlay";
import { getBluePillQuote } from "./quotes";

type Preferences = {
  matrixDensity?: MatrixDensity;
  soundsOn: boolean;
};

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const alreadyRunning = await isOverlayRunning();

    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    await showToast({
      style: Toast.Style.Success,
      title: getBluePillQuote(alreadyRunning),
    });

    if (!alreadyRunning) {
      await startOverlay({
        matrixDensity: preferences.matrixDensity,
        soundsOn: preferences.soundsOn,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "failed to enter the matrix ⛓️‍💥",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

import { PopToRootType, Toast, closeMainWindow, showToast } from "@raycast/api";
import { stopOverlay } from "./overlay";
import { getRedPillQuote } from "./quotes";

export default async function Command() {
  try {
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    const stopPromise = stopOverlay();

    await showToast({
      style: Toast.Style.Failure,
      title: getRedPillQuote(),
    });

    await stopPromise;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "failed to exit the matrix",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

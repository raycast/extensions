import { showHUD, PopToRootType } from "@raycast/api";
import { useBaseWindowResize } from "./useBaseWindowResize";
import { isTimeoutError, TIMEOUT_ERROR_HUD_TITLE } from "../utils/timeout";

export function useFavWindowResize() {
  const { adjustWindowSize } = useBaseWindowResize();

  async function resizeWindow(width: number, height: number) {
    await adjustWindowSize(width, height, {
      onNoWindow: async () => {
        await showHUD("🛑 No focused window", {
          popToRootType: PopToRootType.Immediate,
        });
      },
      onAlreadyResized: async (width, height) => {
        await showHUD(`✔️ Already in ${width}×${height}`, {
          popToRootType: PopToRootType.Immediate,
        });
      },
      onResizeComplete: async (width, height, isRestricted) => {
        const appRestrictionInfo = isRestricted ? " (Restricted)" : "";
        await showHUD(`↙↗ Resized to ${width}×${height}${appRestrictionInfo}`, {
          popToRootType: PopToRootType.Immediate,
        });
      },
      onError: async (err) => {
        if (isTimeoutError(err)) {
          await showHUD(TIMEOUT_ERROR_HUD_TITLE, { popToRootType: PopToRootType.Immediate });
          return;
        }

        const errorStr = String(err);
        if (
          errorStr.includes("frontmost") ||
          errorStr.includes("window") ||
          errorStr.includes("process") ||
          errorStr.includes("Failed to get screen information")
        ) {
          await showHUD("🛑 No focused window", { popToRootType: PopToRootType.Immediate });
        } else {
          await showHUD("🛑 Resize failed", { popToRootType: PopToRootType.Immediate });
        }
      },
    });
  }

  return {
    resizeWindow,
  };
}

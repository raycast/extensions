import { showHUD, showToast, Toast, PopToRootType } from "@raycast/api";
import { useBaseWindowResize } from "./useBaseWindowResize";

export function useWindowResize() {
  const { adjustWindowSize } = useBaseWindowResize();

  async function resizeWindow(width: number, height: number) {
    await adjustWindowSize(width, height, {
      onNoWindow: async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "No focused window",
        });
      },
      onAlreadyResized: async (width, height) => {
        await showToast({
          style: Toast.Style.Success,
          title: `Already in ${width}×${height}`,
        });
      },
      onResizeComplete: async (width, height, isRestricted) => {
        const appRestrictionInfo = isRestricted ? " (Restricted)" : "";
        await showHUD(`↙↗ Resized to ${width}×${height}${appRestrictionInfo}`, {
          popToRootType: PopToRootType.Immediate,
        });
      },
      onError: async (err) => {
        const errorStr = String(err);
        if (
          errorStr.includes("frontmost") ||
          errorStr.includes("window") ||
          errorStr.includes("process") ||
          errorStr.includes("Failed to get screen information")
        ) {
          await showHUD("🛑 No focused window");
        } else {
          await showHUD("🛑 Resize failed");
        }
      },
    });
  }

  return {
    resizeWindow,
  };
}

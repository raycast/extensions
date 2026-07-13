import { Clipboard, showToast, Toast } from "@raycast/api";
import { takeScreenshot } from "./utils/adb";
import { join } from "path";
import { tmpdir } from "os";
import { getErrorMessage } from "./utils/errors";

export default function Command() {
  return (async function () {
    const toast = await showToast({
      title: "Taking screenshot...",
      style: Toast.Style.Animated,
    });
    try {
      const tempFile = join(tmpdir(), `adb-screenshot-${Date.now()}.png`);
      await takeScreenshot(tempFile);

      const imageFile = { file: tempFile };
      await Clipboard.copy(imageFile);

      toast.style = Toast.Style.Success;
      toast.title = "Screenshot Copied to Clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to take screenshot";
      toast.message = getErrorMessage(error);
    }
  })();
}

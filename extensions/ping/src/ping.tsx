import { showHUD, showToast, Toast } from "@raycast/api";
import clipboard from "./utils/clipboard";
import startPing from "./utils/startPing";

export default async () => {
  try {
    const content = String(await clipboard.get());
    startPing(content);
    await showHUD("Check The Result in Terminal");
  } catch (e) {
    if (typeof e === "string") {
      await showToast(Toast.Style.Failure, "Ping failed", e);
    }
  }
};

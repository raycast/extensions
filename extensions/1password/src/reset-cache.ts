import { showToast, Toast } from "@raycast/api";
import { clearCache } from "./v8/utils";

export default async function resetCache() {
  try {
    clearCache();
    await showToast({ title: "Cache is cleared" });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Falied",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
